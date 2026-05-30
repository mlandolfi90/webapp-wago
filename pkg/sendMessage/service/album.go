package send_service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	instance_model "github.com/webapp-wago/webapp-wago/pkg/instance/model"
	"github.com/webapp-wago/webapp-wago/pkg/utils"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waCommon"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

// AlbumItem es un medio del álbum.
type AlbumItem struct {
	Type string `json:"type"` // "image" | "video"
	URL  string `json:"url"`
}

// AlbumStruct es el body de POST /send/album.
type AlbumStruct struct {
	Number    string      `json:"number"`
	FormatJid bool        `json:"formatJid,omitempty"`
	Caption   string      `json:"caption,omitempty"` // va en el PRIMER hijo
	Items     []AlbumItem `json:"items"`
}

// uploadedMedia son los campos que necesitamos del resultado de Upload
// para construir el mensaje hijo. Aislado para poder testear el armado.
type uploadedMedia struct {
	URL           string
	DirectPath    string
	MediaKey      []byte
	FileEncSHA256 []byte
	FileSHA256    []byte
	FileLength    uint64
	Mimetype      string
}

// buildAlbumParent construye el mensaje "stub" de álbum (padre).
// Función pura → testeable sin cliente ni red.
func buildAlbumParent(imageCount, videoCount uint32) *waE2E.Message {
	return &waE2E.Message{AlbumMessage: &waE2E.AlbumMessage{
		ExpectedImageCount: proto.Uint32(imageCount),
		ExpectedVideoCount: proto.Uint32(videoCount),
	}}
}

// buildAlbumChild construye un hijo (imagen/video) vinculado al padre vía
// MessageContextInfo.MessageAssociation (MEDIA_ALBUM). Función pura.
func buildAlbumChild(m uploadedMedia, index int, parent *waCommon.MessageKey, caption string, isVideo bool) *waE2E.Message {
	assoc := &waE2E.MessageContextInfo{
		MessageAssociation: &waE2E.MessageAssociation{
			AssociationType:  waE2E.MessageAssociation_MEDIA_ALBUM.Enum(),
			ParentMessageKey: parent,
			MessageIndex:     proto.Int32(int32(index)),
		},
	}
	if isVideo {
		return &waE2E.Message{VideoMessage: &waE2E.VideoMessage{
			Caption:       proto.String(caption),
			URL:           proto.String(m.URL),
			DirectPath:    proto.String(m.DirectPath),
			MediaKey:      m.MediaKey,
			Mimetype:      proto.String(m.Mimetype),
			FileEncSHA256: m.FileEncSHA256,
			FileSHA256:    m.FileSHA256,
			FileLength:    proto.Uint64(m.FileLength),
		}, MessageContextInfo: assoc}
	}
	return &waE2E.Message{ImageMessage: &waE2E.ImageMessage{
		Caption:       proto.String(caption),
		URL:           proto.String(m.URL),
		DirectPath:    proto.String(m.DirectPath),
		MediaKey:      m.MediaKey,
		Mimetype:      proto.String(m.Mimetype),
		FileEncSHA256: m.FileEncSHA256,
		FileSHA256:    m.FileSHA256,
		FileLength:    proto.Uint64(m.FileLength),
	}, MessageContextInfo: assoc}
}

// WAGO-PATCH(ADR-0059): SSRF guard. `downloadMedia` antes hacía
// http.Get(url) sin validar destino → operador autenticado podía
// pivotar a la red interna o leer cloud metadata
// (http://169.254.169.254/). Ahora bloqueamos:
// - schemes distintos de http/https
// - loopback, link-local, private (RFC1918), IMDS
// El check se hace tras resolver el DNS (para que un host
// público que apunta a IP privada también caiga).
var ssrfBlockedRanges = func() []*net.IPNet {
	cidrs := []string{
		"127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
		"169.254.0.0/16", "::1/128", "fc00::/7", "fe80::/10",
	}
	nets := make([]*net.IPNet, 0, len(cidrs))
	for _, c := range cidrs {
		_, n, err := net.ParseCIDR(c)
		if err == nil {
			nets = append(nets, n)
		}
	}
	return nets
}()

func isBlockedIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	for _, n := range ssrfBlockedRanges {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func validateMediaURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("URL inválida: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("URL inválida: scheme %q no soportado (solo http/https)", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return errors.New("URL inválida: host vacío")
	}
	// Si es una IP directa, validamos esa.
	if ip := net.ParseIP(host); ip != nil {
		if isBlockedIP(ip) {
			return fmt.Errorf("URL inválida: host %q apunta a rango privado/loopback/IMDS", host)
		}
		return nil
	}
	// Es un hostname → resolver y chequear TODAS las IPs.
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("resolución de %q falló: %w", host, err)
	}
	for _, ip := range ips {
		if isBlockedIP(ip) {
			return fmt.Errorf("URL inválida: %q resuelve a %s (rango bloqueado)", host, ip)
		}
	}
	return nil
}

func downloadMedia(rawURL string) ([]byte, string, error) {
	if err := validateMediaURL(rawURL); err != nil {
		return nil, "", err
	}
	cl := &http.Client{
		Timeout: 60 * time.Second,
		// Evita redirects que apunten a hosts privados (atacante podría
		// servir un 302 → http://169.254.169.254).
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("demasiados redirects")
			}
			return validateMediaURL(req.URL.String())
		},
	}
	res, err := cl.Get(rawURL)
	if err != nil {
		// Mensaje genérico para no filtrar topología de red interna.
		return nil, "", fmt.Errorf("descarga falló (%s...)", strings.SplitN(rawURL, "?", 2)[0])
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, "", fmt.Errorf("descarga: HTTP %d", res.StatusCode)
	}
	b, err := io.ReadAll(io.LimitReader(res.Body, 64<<20))
	if err != nil {
		return nil, "", err
	}
	mt := res.Header.Get("Content-Type")
	if mt == "" {
		mt = http.DetectContentType(b)
	}
	return b, mt, nil
}

// SendAlbum envía un álbum real: un AlbumMessage padre + N hijos
// image/video asociados (MEDIA_ALBUM). Reusa Upload de whatsmeow; NO
// parchea el submódulo (ADR 0036/0038). La validación contra dispositivo
// real queda a cargo del humano (ver RUN-LEDGER send-album-001).
// WAGO-PATCH(ADR-0059): cap de items por álbum. Sin esto, un operador
// autenticado podía mandar 100 items × 64MB cada uno = 6.4GB en RAM por
// petición (LimitReader ya estaba en downloadMedia pero sin top-level
// cap). 20 items es el límite operacional del WhatsApp (el cliente
// móvil no muestra más).
const MaxAlbumItems = 20

func (s *sendService) SendAlbum(data *AlbumStruct, instance *instance_model.Instance) (*MessageSendStruct, error) {
	if len(data.Items) < 2 {
		return nil, errors.New("un álbum necesita al menos 2 items (para 1 usá /send/media)")
	}
	if len(data.Items) > MaxAlbumItems {
		return nil, fmt.Errorf("máximo %d items por álbum (recibidos %d)", MaxAlbumItems, len(data.Items))
	}
	client, err := s.ensureClientConnected(instance.Id)
	if err != nil {
		return nil, err
	}
	recipient, ok := utils.ParseJID(data.Number)
	if !ok {
		return nil, errors.New("invalid phone number")
	}

	var imgN, vidN uint32
	for _, it := range data.Items {
		switch it.Type {
		case "image":
			imgN++
		case "video":
			vidN++
		default:
			return nil, fmt.Errorf("item type inválido %q (image|video)", it.Type)
		}
		if it.URL == "" {
			return nil, errors.New("cada item necesita url")
		}
	}

	ctx := context.Background()
	parentResp, err := client.SendMessage(ctx, recipient, buildAlbumParent(imgN, vidN))
	if err != nil {
		s.loggerWrapper.GetLogger(instance.Id).LogError("[%s] album parent: %v", instance.Id, err)
		return nil, errors.New("error enviando el álbum (padre)")
	}

	parentKey := &waCommon.MessageKey{
		RemoteJID: proto.String(recipient.String()),
		FromMe:    proto.Bool(true),
		ID:        proto.String(string(parentResp.ID)),
	}

	for i, it := range data.Items {
		bytes, mime, err := downloadMedia(it.URL)
		if err != nil {
			return nil, fmt.Errorf("item %d (%s): %w", i+1, it.URL, err)
		}
		uploadType := whatsmeow.MediaImage
		if it.Type == "video" {
			uploadType = whatsmeow.MediaVideo
		}
		up, err := client.Upload(ctx, bytes, uploadType)
		if err != nil {
			return nil, fmt.Errorf("item %d upload: %w", i+1, err)
		}
		caption := ""
		if i == 0 {
			caption = data.Caption
		}
		child := buildAlbumChild(uploadedMedia{
			URL: up.URL, DirectPath: up.DirectPath, MediaKey: up.MediaKey,
			FileEncSHA256: up.FileEncSHA256, FileSHA256: up.FileSHA256,
			FileLength: uint64(len(bytes)), Mimetype: mime,
		}, i, parentKey, caption, it.Type == "video")

		if _, err := client.SendMessage(ctx, recipient, child); err != nil {
			return nil, fmt.Errorf("item %d (%d/%d) enviado parcial: %w", i+1, i, len(data.Items), err)
		}
	}

	return &MessageSendStruct{Message: buildAlbumParent(imgN, vidN)}, nil
}
