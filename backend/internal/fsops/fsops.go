package fsops

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"pan-webclient/backend/internal/mounts"
)

var textExtensions = map[string]bool{
	".txt": true, ".md": true, ".markdown": true, ".json": true, ".yaml": true, ".yml": true,
	".xml": true, ".log": true, ".go": true, ".ts": true, ".tsx": true, ".js": true, ".jsx": true,
	".css": true, ".html": true, ".sh": true, ".env": true, ".sql": true, ".java": true, ".py": true,
}

type Entry struct {
	MountID   string `json:"mountId"`
	Path      string `json:"path"`
	Name      string `json:"name"`
	IsDir     bool   `json:"isDir"`
	Size      int64  `json:"size"`
	ModTime   int64  `json:"modTime"`
	Mime      string `json:"mime"`
	Extension string `json:"extension"`
	Hidden    bool   `json:"-"`
}

type TreeNode struct {
	MountID     string `json:"mountId"`
	Path        string `json:"path"`
	Name        string `json:"name"`
	HasChildren bool   `json:"hasChildren"`
}

type MountResolver struct {
	byID map[string]mounts.Mount
}

func NewMountResolver(items []mounts.Mount) *MountResolver {
	byID := make(map[string]mounts.Mount, len(items))
	for _, item := range items {
		byID[item.ID] = item
	}
	return &MountResolver{byID: byID}
}

func (r *MountResolver) Resolve(mountID, relPath string) (mounts.Mount, string, string, error) {
	mount, ok := r.byID[mountID]
	if !ok {
		return mounts.Mount{}, "", "", fmt.Errorf("mount %s not found", mountID)
	}
	if hasTraversal(relPath) {
		return mounts.Mount{}, "", "", errors.New("path escapes mount root")
	}
	clean := cleanRelPath(relPath)
	abs := filepath.Clean(filepath.Join(mount.Path, "."+clean))
	if !withinRoot(mount.Path, abs) {
		return mounts.Mount{}, "", "", errors.New("path escapes mount root")
	}
	if strings.Contains(clean, "\x00") {
		return mounts.Mount{}, "", "", errors.New("invalid path")
	}
	return mount, abs, clean, nil
}

func (r *MountResolver) Mounts() []mounts.Mount {
	items := make([]mounts.Mount, 0, len(r.byID))
	for _, item := range r.byID {
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Name < items[j].Name })
	return items
}

func ListDirectory(resolver *MountResolver, mountID, relPath string, showHidden bool) ([]Entry, error) {
	mount, abs, clean, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", clean)
	}
	entries, err := os.ReadDir(abs)
	if err != nil {
		return nil, err
	}
	result := make([]Entry, 0, len(entries))
	for _, item := range entries {
		if !showHidden && isHiddenName(item.Name()) {
			continue
		}
		info, err := item.Info()
		if err != nil {
			continue
		}
		if info.Mode()&os.ModeSymlink != 0 {
			continue
		}
		childRel := cleanRelPath(filepath.Join(clean, item.Name()))
		result = append(result, entryFromInfo(mount.ID, childRel, item.Name(), info, isHiddenRelPath(childRel)))
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})
	return result, nil
}

func Tree(resolver *MountResolver, mountID, relPath string, showHidden bool) ([]TreeNode, error) {
	entries, err := ListDirectory(resolver, mountID, relPath, showHidden)
	if err != nil {
		return nil, err
	}
	nodes := make([]TreeNode, 0, len(entries))
	for _, item := range entries {
		if !item.IsDir {
			continue
		}
		hasChildren := false
		children, err := os.ReadDir(filepath.Join(resolver.byID[mountID].Path, "."+item.Path))
		if err == nil {
			for _, child := range children {
				if showHidden || !isHiddenName(child.Name()) {
					hasChildren = true
					break
				}
			}
		}
		nodes = append(nodes, TreeNode{
			MountID:     item.MountID,
			Path:        item.Path,
			Name:        item.Name,
			HasChildren: hasChildren,
		})
	}
	return nodes, nil
}

func ReadTextFile(resolver *MountResolver, mountID, relPath string, maxBytes int64) ([]byte, os.FileInfo, error) {
	_, abs, _, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return nil, nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, nil, err
	}
	if info.IsDir() {
		return nil, nil, errors.New("directory cannot be edited")
	}
	if info.Size() > maxBytes {
		return nil, nil, fmt.Errorf("file exceeds edit limit: %d", info.Size())
	}
	if !IsTextLike(abs) {
		return nil, nil, errors.New("file type is not editable")
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, nil, err
	}
	return data, info, nil
}

func WriteTextFile(resolver *MountResolver, mountID, relPath string, content []byte, expectedVersion string) (os.FileInfo, error) {
	_, abs, _, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, err
	}
	currentVersion := VersionFromInfo(info)
	if expectedVersion != "" && expectedVersion != currentVersion {
		return nil, fmt.Errorf("version conflict")
	}
	if err := os.WriteFile(abs, content, 0o644); err != nil {
		return nil, err
	}
	return os.Stat(abs)
}

func Mkdir(resolver *MountResolver, mountID, relPath, name string) (Entry, error) {
	_, abs, clean, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return Entry{}, err
	}
	target := filepath.Join(abs, filepath.Base(name))
	if !withinRoot(filepath.Join(abs, ".."), target) {
		return Entry{}, errors.New("invalid folder name")
	}
	if err := os.Mkdir(target, 0o755); err != nil {
		return Entry{}, err
	}
	info, err := os.Stat(target)
	if err != nil {
		return Entry{}, err
	}
	childRel := cleanRelPath(filepath.Join(clean, filepath.Base(name)))
	return entryFromInfo(mountID, childRel, filepath.Base(name), info, isHiddenRelPath(childRel)), nil
}

func Rename(resolver *MountResolver, mountID, relPath, newName string) (Entry, error) {
	if cleanRelPath(relPath) == "/" {
		return Entry{}, errors.New("mount root cannot be renamed")
	}
	_, abs, clean, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return Entry{}, err
	}
	target := filepath.Join(filepath.Dir(abs), filepath.Base(newName))
	if !withinRoot(filepath.Dir(abs), target) {
		return Entry{}, errors.New("invalid rename target")
	}
	if err := os.Rename(abs, target); err != nil {
		return Entry{}, err
	}
	info, err := os.Stat(target)
	if err != nil {
		return Entry{}, err
	}
	newRel := cleanRelPath(filepath.Join(filepath.Dir(clean), filepath.Base(newName)))
	return entryFromInfo(mountID, newRel, filepath.Base(newName), info, isHiddenRelPath(newRel)), nil
}

func Move(resolver *MountResolver, mountID, relPath, targetDir string) (Entry, error) {
	if cleanRelPath(relPath) == "/" {
		return Entry{}, errors.New("mount root cannot be moved")
	}
	_, abs, _, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return Entry{}, err
	}
	_, targetAbs, targetClean, err := resolver.Resolve(mountID, targetDir)
	if err != nil {
		return Entry{}, err
	}
	if _, err := os.Stat(abs); err != nil {
		return Entry{}, err
	}
	dest := filepath.Join(targetAbs, filepath.Base(abs))
	if err := os.Rename(abs, dest); err != nil {
		return Entry{}, err
	}
	newInfo, err := os.Stat(dest)
	if err != nil {
		return Entry{}, err
	}
	newRel := cleanRelPath(filepath.Join(targetClean, filepath.Base(abs)))
	return entryFromInfo(mountID, newRel, filepath.Base(abs), newInfo, isHiddenRelPath(newRel)), nil
}

func Copy(resolver *MountResolver, mountID, relPath, targetDir string) (Entry, error) {
	if cleanRelPath(relPath) == "/" {
		return Entry{}, errors.New("mount root cannot be copied")
	}
	_, srcAbs, _, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return Entry{}, err
	}
	_, targetAbs, targetClean, err := resolver.Resolve(mountID, targetDir)
	if err != nil {
		return Entry{}, err
	}
	if _, err := os.Stat(srcAbs); err != nil {
		return Entry{}, err
	}
	dest := filepath.Join(targetAbs, filepath.Base(srcAbs))
	if err := copyRecursively(srcAbs, dest); err != nil {
		return Entry{}, err
	}
	newInfo, err := os.Stat(dest)
	if err != nil {
		return Entry{}, err
	}
	newRel := cleanRelPath(filepath.Join(targetClean, filepath.Base(srcAbs)))
	return entryFromInfo(mountID, newRel, filepath.Base(srcAbs), newInfo, isHiddenRelPath(newRel)), nil
}

func SaveUploadedFile(resolver *MountResolver, mountID, relPath, filename string, src io.Reader) (Entry, int64, error) {
	_, abs, clean, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return Entry{}, 0, err
	}
	targetName := filepath.Base(filename)
	target := filepath.Join(abs, targetName)
	dst, err := os.Create(target)
	if err != nil {
		return Entry{}, 0, err
	}
	defer dst.Close()
	written, err := io.Copy(dst, src)
	if err != nil {
		return Entry{}, written, err
	}
	info, err := os.Stat(target)
	if err != nil {
		return Entry{}, written, err
	}
	targetRel := cleanRelPath(filepath.Join(clean, targetName))
	return entryFromInfo(mountID, targetRel, targetName, info, isHiddenRelPath(targetRel)), written, nil
}

func OpenFile(resolver *MountResolver, mountID, relPath string) (*os.File, os.FileInfo, error) {
	_, abs, _, err := resolver.Resolve(mountID, relPath)
	if err != nil {
		return nil, nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, nil, err
	}
	file, err := os.Open(abs)
	if err != nil {
		return nil, nil, err
	}
	return file, info, nil
}

func CollectEntries(mountID, root string, includeHidden bool) ([]Entry, error) {
	entries := make([]Entry, 0, 256)
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if path == root {
			return nil
		}
		name := d.Name()
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		hidden := isHiddenRelPath(rel)
		if hidden && !includeHidden {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := d.Info()
		if err != nil || info.Mode()&os.ModeSymlink != 0 {
			return nil
		}
		entries = append(entries, entryFromInfo(mountID, cleanRelPath(rel), name, info, hidden))
		return nil
	})
	return entries, err
}

func IsTextLike(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	if textExtensions[ext] {
		return true
	}
	mimeType := mime.TypeByExtension(ext)
	return strings.HasPrefix(mimeType, "text/")
}

func DetectMime(path string, sample []byte) string {
	if sample != nil && len(sample) > 0 {
		return http.DetectContentType(sample)
	}
	if mimeType := mime.TypeByExtension(strings.ToLower(filepath.Ext(path))); mimeType != "" {
		return mimeType
	}
	return "application/octet-stream"
}

func VersionFromInfo(info os.FileInfo) string {
	return fmt.Sprintf("%d", info.ModTime().UnixNano())
}

func entryFromInfo(mountID, relPath, name string, info os.FileInfo, hidden bool) Entry {
	return Entry{
		MountID:   mountID,
		Path:      cleanRelPath(relPath),
		Name:      name,
		IsDir:     info.IsDir(),
		Size:      info.Size(),
		ModTime:   info.ModTime().Unix(),
		Mime:      mimeTypeForInfo(name, info),
		Extension: strings.ToLower(filepath.Ext(name)),
		Hidden:    hidden,
	}
}

func mimeTypeForInfo(name string, info os.FileInfo) string {
	if info.IsDir() {
		return "inode/directory"
	}
	if mimeType := mime.TypeByExtension(strings.ToLower(filepath.Ext(name))); mimeType != "" {
		return mimeType
	}
	return "application/octet-stream"
}

func cleanRelPath(path string) string {
	if path == "" || path == "." {
		return "/"
	}
	clean := filepath.ToSlash(filepath.Clean("/" + path))
	if clean == "." {
		return "/"
	}
	return clean
}

func isHiddenName(name string) bool {
	return strings.HasPrefix(name, ".")
}

func isHiddenRelPath(path string) bool {
	clean := cleanRelPath(path)
	for _, part := range strings.Split(strings.Trim(clean, "/"), "/") {
		if isHiddenName(part) {
			return true
		}
	}
	return false
}

func hasTraversal(path string) bool {
	for _, part := range strings.Split(strings.ReplaceAll(path, "\\", "/"), "/") {
		if part == ".." {
			return true
		}
	}
	return false
}

func withinRoot(root, target string) bool {
	root = filepath.Clean(root)
	target = filepath.Clean(target)
	rel, err := filepath.Rel(root, target)
	if err != nil {
		return false
	}
	return rel == "." || (!strings.HasPrefix(rel, "..") && rel != "..")
}

func copyRecursively(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if err := os.MkdirAll(dst, 0o755); err != nil {
			return err
		}
		entries, err := os.ReadDir(src)
		if err != nil {
			return err
		}
		for _, item := range entries {
			if item.Name() == ".DS_Store" {
				continue
			}
			if err := copyRecursively(filepath.Join(src, item.Name()), filepath.Join(dst, item.Name())); err != nil {
				return err
			}
		}
		return nil
	}

	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return err
	}
	return os.Chtimes(dst, time.Now(), info.ModTime())
}
