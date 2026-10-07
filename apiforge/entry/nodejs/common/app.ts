import express from "express";
import cors from "cors";
import helmet from "helmet";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./routes/health.js";
import appRoutes from "./routes/index.js";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(requestLogger);

    app.use(healthRoutes);
    app.use(appRoutes);

    app.use(errorHandler);

    return app;
}
