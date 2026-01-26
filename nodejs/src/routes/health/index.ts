import express, { Request, Response } from "express";
import { AppDataSource } from "../../dal/dataSource.js";

const router = express.Router({ mergeParams: true });

interface HealthStatus {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    database: {
        status: "connected" | "disconnected";
        type: string;
    };
    service: string;
}

router.get("/", async (req: Request, res: Response) => {
    try {
        let dbStatus: "connected" | "disconnected" = "disconnected";
        let dbType = "unknown";

        try {
            if (AppDataSource.isInitialized) {
                // Try a simple query to verify connection
                await AppDataSource.query("SELECT 1");
                dbStatus = "connected";
                dbType = AppDataSource.options.type as string;
            }
        } catch (error) {
            dbStatus = "disconnected";
        }

        const healthStatus: HealthStatus = {
            status: dbStatus === "connected" ? "healthy" : "unhealthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: dbStatus,
                type: dbType,
            },
            service: "nodejs-app",
        };

        const statusCode = healthStatus.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: "disconnected",
                type: "unknown",
            },
            service: "nodejs-app",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

router.get("/liveness", (req: Request, res: Response) => {
    res.status(200).json({
        status: "alive",
        timestamp: new Date().toISOString(),
    });
});

router.get("/readiness", async (req: Request, res: Response) => {
    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.query("SELECT 1");
            res.status(200).json({
                status: "ready",
                timestamp: new Date().toISOString(),
                database: "connected",
            });
        } else {
            res.status(503).json({
                status: "not ready",
                timestamp: new Date().toISOString(),
                database: "disconnected",
            });
        }
    } catch (error) {
        res.status(503).json({
            status: "not ready",
            timestamp: new Date().toISOString(),
            database: "disconnected",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
