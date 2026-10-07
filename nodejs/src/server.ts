import express from "express";
import appRoutes from "./routes/index.js";
import "reflect-metadata";
import { AppDataSource } from "./dal/dataSource.js";
import logger from "./services/logger/index.js";

import { Request, Response, NextFunction } from "express";
import { morganLogger } from "./middleware/morganLogger.js";
import morgan from "morgan";
import { requestLogger } from "./middleware/requestLogger.js";
import healthRoutes from "./routes/health/index.js";

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morganLogger);
app.use(requestLogger);

const router = express.Router({ mergeParams: true });
app.use(router);

router.use("/health", healthRoutes);
router.use("/app", appRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // handle the error as required
    res.status(500).send(err.message);
});

AppDataSource.initialize();

app.listen(PORT, () => {
    logger.info("Server is listening on the port", PORT);
    console.log("Server is listening on the port", PORT);
});
