package trash

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"pan-webclient/apps/api/internal/fsops"
)

type DeletedRecord struct {
	MountID    string
	Original   string
	TrashPath  string
	DeletedAt  int64
	IsDir      bool
	Size       int64
	OriginalID string
}

func MoveToTrash(resolver *fsops.MountResolver, mountID, relPath, trashRoot string) (DeletedRecord, error) {
	if relPath == "/" || relPath == "" {
		return DeletedRecord{}, fmt.Errorf("mount root cannot be deleted")
	}
	_, abs, clean, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return DeletedRecord{}, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return DeletedRecord{}, err
	}
	stamp := time.Now().Format("20060102-150405")
	base := strings.TrimPrefix(clean, "/")
	base = strings.ReplaceAll(base, "/", "_")
	if base == "" {
		base = "root"
	}
	targetRel := fmt.Sprintf("%s-%s", stamp, base)
	target := filepath.Join(trashRoot, targetRel)
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return DeletedRecord{}, err
	}
	if err := os.Rename(abs, target); err != nil {
		return DeletedRecord{}, err
	}
	return DeletedRecord{
		MountID:   mountID,
		Original:  clean,
		TrashPath: target,
		DeletedAt: time.Now().Unix(),
		IsDir:     info.IsDir(),
		Size:      info.Size(),
	}, nil
}
