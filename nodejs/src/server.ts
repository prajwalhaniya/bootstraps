import express from "express";
import appRoutes from "./routes/index.js";
import "reflect-metadata";
import { AppDataSource } from "./dal/dataSource.js";
import { User } from "./dal/models/User.js";

const PORT = 3000;
const app = express();

const router = express.Router({ mergeParams: true });

app.use(router);

router.use("/app", appRoutes);

AppDataSource.initialize();

app.listen(PORT, () => {
    console.log("Server is listening on the port", PORT);
});

