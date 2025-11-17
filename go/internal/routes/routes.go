package routes

import (
	"app/internal/routes/health"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Register(r *gin.Engine, db *gorm.DB) {
	health.Register(r)
}
