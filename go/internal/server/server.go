package server

import (
	"app/internal/config"
	"app/internal/routes"
	"fmt"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Server struct {
	engine *gin.Engine
	db     *gorm.DB
	cfg    *config.Config
}

func New(db *gorm.DB, cfg *config.Config) *Server {
	r := gin.Default()

	s := &Server{
		engine: r,
		db:     db,
		cfg:    cfg,
	}

	routes.Register(s.engine, db)

	return s
}

func (s *Server) Start() {
	addr := fmt.Sprintf(":%s", s.cfg.Port)
	s.engine.Run(addr)
}
