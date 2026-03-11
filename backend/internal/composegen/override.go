package composegen

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"pan-webclient/backend/internal/config"
)

type volumeMount struct {
	source   string
	target   string
	readOnly bool
}

func GenerateOverride() (string, error) {
	mounts, err := config.LoadMountDefinitions()
	if err != nil {
		return "", err
	}
	return BuildOverride(mounts)
}

func WriteOverride(path string) error {
	override, err := GenerateOverride()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(override), 0o644)
}

func BuildOverride(mounts []config.Mount) (string, error) {
	filtered, err := collectVolumeMounts(mounts)
	if err != nil {
		return "", err
	}
	if len(filtered) == 0 {
		return "services: {}\n", nil
	}

	var builder strings.Builder
	builder.WriteString("services:\n")
	builder.WriteString("  api:\n")
	builder.WriteString("    volumes:\n")
	for _, mount := range filtered {
		builder.WriteString("      - type: bind\n")
		builder.WriteString("        source: " + yamlString(mount.source) + "\n")
		builder.WriteString("        target: " + yamlString(mount.target) + "\n")
		if mount.readOnly {
			builder.WriteString("        read_only: true\n")
		}
	}
	return builder.String(), nil
}

func collectVolumeMounts(mounts []config.Mount) ([]volumeMount, error) {
	seen := map[string]volumeMount{}
	result := make([]volumeMount, 0, len(mounts))
	for _, mount := range mounts {
		if strings.TrimSpace(mount.Source) == "" {
			continue
		}
		key := mount.Source + "\x00" + mount.Path
		candidate := volumeMount{
			source:   mount.Source,
			target:   mount.Path,
			readOnly: mount.ReadOnly,
		}
		if existing, ok := seen[key]; ok {
			if existing.readOnly != candidate.readOnly {
				return nil, fmt.Errorf("conflicting readOnly for mount source %s target %s", mount.Source, mount.Path)
			}
			continue
		}
		seen[key] = candidate
		result = append(result, candidate)
	}
	return result, nil
}

func yamlString(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}
