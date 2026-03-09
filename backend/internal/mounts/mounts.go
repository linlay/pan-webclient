package mounts

import "pan-webclient/backend/internal/config"

type Mount struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

func FromConfig(items []config.Mount) []Mount {
	result := make([]Mount, 0, len(items))
	for _, item := range items {
		result = append(result, Mount{
			ID:   item.ID,
			Name: item.Name,
			Path: item.Path,
		})
	}
	return result
}
