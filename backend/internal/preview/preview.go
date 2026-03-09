package preview

import (
	"io"
	"path/filepath"
	"strings"

	"pan-webclient/backend/internal/fsops"
)

type Meta struct {
	MountID   string `json:"mountId"`
	Path      string `json:"path"`
	Name      string `json:"name"`
	Kind      string `json:"kind"`
	Mime      string `json:"mime"`
	Size      int64  `json:"size"`
	ModTime   int64  `json:"modTime"`
	Content   string `json:"content,omitempty"`
	StreamURL string `json:"streamUrl,omitempty"`
}

func Build(resolver *fsops.MountResolver, mountID, relPath string, rawURL string, maxTextBytes int64) (Meta, error) {
	file, info, err := fsops.OpenFile(resolver, mountID, relPath)
	if err != nil {
		return Meta{}, err
	}
	defer file.Close()
	if info.IsDir() {
		return Meta{
			MountID: mountID,
			Path:    relPath,
			Name:    filepath.Base(relPath),
			Kind:    "directory",
			Mime:    "inode/directory",
			Size:    info.Size(),
			ModTime: info.ModTime().Unix(),
		}, nil
	}
	sample := make([]byte, 512)
	n, _ := file.Read(sample)
	sample = sample[:n]
	mimeType := fsops.DetectMime(relPath, sample)
	kind := classify(relPath, mimeType)
	meta := Meta{
		MountID: mountID,
		Path:    relPath,
		Name:    filepath.Base(relPath),
		Kind:    kind,
		Mime:    mimeType,
		Size:    info.Size(),
		ModTime: info.ModTime().Unix(),
	}
	if kind == "text" || kind == "markdown" {
		if info.Size() > maxTextBytes {
			meta.Kind = "download"
			meta.StreamURL = rawURL
			return meta, nil
		}
		if _, err := file.Seek(0, io.SeekStart); err == nil {
			data, err := io.ReadAll(file)
			if err == nil {
				meta.Content = string(data)
			}
		}
		return meta, nil
	}
	meta.StreamURL = rawURL
	return meta, nil
}

func classify(path, mimeType string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch {
	case mimeType == "application/pdf":
		return "pdf"
	case strings.HasPrefix(mimeType, "image/"):
		return "image"
	case strings.HasPrefix(mimeType, "video/"):
		return "video"
	case strings.HasPrefix(mimeType, "audio/"):
		return "audio"
	case ext == ".md" || ext == ".markdown":
		return "markdown"
	case strings.HasPrefix(mimeType, "text/") || fsops.IsTextLike(path):
		return "text"
	default:
		return "download"
	}
}
