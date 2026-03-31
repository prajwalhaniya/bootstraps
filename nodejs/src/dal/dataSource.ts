import { DataSource } from "typeorm";
import { User } from "./models/User.js";

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: process.env.DB_PATH ?? "./database.sqlite",
    synchronize: process.env.NODE_ENV !== "production",
    logging: process.env.NODE_ENV !== "production",
    entities: [User],
    logger: "advanced-console",
});