import express from "express";
import appRoutes from "./routes/index.js";
import "reflect-metadata";
import { AppDataSource } from "./dal/dataSource.js";
import logger from "./services/logger/index.js";

import { Request, Response, NextFunction } from "express";

const PORT = 3000;
const app = express();

const router = express.Router({ mergeParams: true });

app.use(router);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // handle the error as required
    res.status(500).send(err.message);
});

router.use("/app", appRoutes);

AppDataSource.initialize();

app.listen(PORT, () => {
    logger.info("Server is listening on the port", PORT);
    console.log("Server is listening on the port", PORT);
});

