package send_service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
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

func downloadMedia(url string) ([]byte, string, error) {
	cl := &http.Client{Timeout: 60 * time.Second}
	res, err := cl.Get(url)
	if err != nil {
		return nil, "", err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, "", fmt.Errorf("descarga %s: HTTP %d", url, res.StatusCode)
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
func (s *sendService) SendAlbum(data *AlbumStruct, instance *instance_model.Instance) (*MessageSendStruct, error) {
	if len(data.Items) < 2 {
		return nil, errors.New("un álbum necesita al menos 2 items (para 1 usá /send/media)")
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
