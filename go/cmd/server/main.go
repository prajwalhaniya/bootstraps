package main

import (
	"log"

	"app/internal/config"
	"app/internal/db"
	"app/internal/server"
	"app/internal/utils"
)

func main() {
	cfg := config.Load()

	conn, err := db.Connect(cfg)
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}

	srv := server.New(conn, cfg, utils.Logger)
	srv.Start()
}
