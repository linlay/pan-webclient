package main

import (
	"flag"
	"log"

	"pan-webclient/backend/internal/composegen"
)

func main() {
	output := flag.String("output", "../.cache/docker-compose.mounts.yml", "path to the generated docker compose override file")
	flag.Parse()

	if err := composegen.WriteOverride(*output); err != nil {
		log.Fatalf("generate compose mounts: %v", err)
	}
}
