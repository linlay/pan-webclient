package editor

import (
	"path/filepath"
	"strings"

	"pan-webclient/backend/internal/fsops"
)

type Document struct {
	MountID  string `json:"mountId"`
	Path     string `json:"path"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	Language string `json:"language"`
	Version  string `json:"version"`
}

func Load(resolver *fsops.MountResolver, mountID, relPath string, maxBytes int64) (Document, error) {
	data, info, err := fsops.ReadTextFile(resolver, mountID, relPath, maxBytes)
	if err != nil {
		return Document{}, err
	}
	return Document{
		MountID:  mountID,
		Path:     relPath,
		Name:     filepath.Base(relPath),
		Content:  string(data),
		Language: languageFromPath(relPath),
		Version:  fsops.VersionFromInfo(info),
	}, nil
}

func Save(resolver *fsops.MountResolver, mountID, relPath, content, version string) (Document, error) {
	info, err := fsops.WriteTextFile(resolver, mountID, relPath, []byte(content), version)
	if err != nil {
		return Document{}, err
	}
	return Document{
		MountID:  mountID,
		Path:     relPath,
		Name:     filepath.Base(relPath),
		Content:  content,
		Language: languageFromPath(relPath),
		Version:  fsops.VersionFromInfo(info),
	}, nil
}

func languageFromPath(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".md", ".markdown":
		return "markdown"
	case ".json":
		return "json"
	case ".yaml", ".yml":
		return "yaml"
	case ".xml":
		return "xml"
	case ".go":
		return "go"
	case ".ts", ".tsx":
		return "typescript"
	case ".js", ".jsx":
		return "javascript"
	default:
		return "text"
	}
}
