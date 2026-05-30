package send_service

import (
	"testing"

	"go.mau.fi/whatsmeow/proto/waCommon"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

func TestBuildAlbumParentCounts(t *testing.T) {
	p := buildAlbumParent(3, 1)
	am := p.GetAlbumMessage()
	if am == nil {
		t.Fatal("AlbumMessage nil")
	}
	if am.GetExpectedImageCount() != 3 || am.GetExpectedVideoCount() != 1 {
		t.Fatalf("counts = img %d vid %d", am.GetExpectedImageCount(), am.GetExpectedVideoCount())
	}
}

func TestBuildAlbumChildAssociation(t *testing.T) {
	parent := &waCommon.MessageKey{
		RemoteJID: proto.String("549111@s.whatsapp.net"),
		FromMe:    proto.Bool(true),
		ID:        proto.String("PARENT123"),
	}
	m := uploadedMedia{URL: "u", DirectPath: "d", MediaKey: []byte("k"), Mimetype: "image/jpeg", FileLength: 10}

	// Hijo 0 = imagen con caption.
	c0 := buildAlbumChild(m, 0, parent, "hola", false)
	if c0.GetImageMessage() == nil {
		t.Fatal("esperaba ImageMessage")
	}
	if c0.GetImageMessage().GetCaption() != "hola" {
		t.Fatalf("caption i0 = %q", c0.GetImageMessage().GetCaption())
	}
	a0 := c0.GetMessageContextInfo().GetMessageAssociation()
	if a0.GetAssociationType() != waE2E.MessageAssociation_MEDIA_ALBUM {
		t.Fatalf("assoc type = %v", a0.GetAssociationType())
	}
	if a0.GetMessageIndex() != 0 || a0.GetParentMessageKey().GetID() != "PARENT123" {
		t.Fatalf("assoc idx/parent mal: idx=%d parent=%s", a0.GetMessageIndex(), a0.GetParentMessageKey().GetID())
	}

	// Hijo 2 = video sin caption (solo i==0 lleva caption).
	c2 := buildAlbumChild(m, 2, parent, "", true)
	if c2.GetVideoMessage() == nil {
		t.Fatal("esperaba VideoMessage")
	}
	if c2.GetMessageContextInfo().GetMessageAssociation().GetMessageIndex() != 2 {
		t.Fatalf("idx i2 = %d", c2.GetMessageContextInfo().GetMessageAssociation().GetMessageIndex())
	}
}
