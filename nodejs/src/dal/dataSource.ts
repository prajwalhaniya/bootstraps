import { DataSource } from "typeorm";
import { User } from "./models/User.js";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "./database.sqlite",
    synchronize: true,
    logging: false,
    entities:  [User],
    logger: "advanced-console"
});