import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";

export interface PostgresConnectionOptions {
    databaseName: string;
    entities: DataSourceOptions["entities"];
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    synchronize?: boolean;
    logging?: boolean;
}

const connections = new Map<string, DataSource>();

function buildDataSource(options: PostgresConnectionOptions): DataSource {
    const {
        databaseName,
        entities,
        host = process.env.POSTGRES_HOST ?? "localhost",
        port = Number(process.env.POSTGRES_PORT ?? 5432),
        username = process.env.POSTGRES_USER ?? "postgres",
        password = process.env.POSTGRES_PASSWORD ?? "postgres",
        synchronize = false,
        logging = false,
    } = options;

    return new DataSource({
        type: "postgres",
        host,
        port,
        username,
        password,
        database: databaseName,
        entities,
        synchronize,
        logging,
    });
}

/**
 * Connects to a Postgres database for the given database name, reusing an
 * already-initialized DataSource if one exists (so a module that gets
 * re-imported, e.g. under `tsx watch`, doesn't try to initialize twice).
 */
export async function connectPostgres(options: PostgresConnectionOptions): Promise<DataSource> {
    const existing = connections.get(options.databaseName);
    if (existing) return existing;

    const dataSource = buildDataSource(options);
    await dataSource.initialize();
    connections.set(options.databaseName, dataSource);
    return dataSource;
}

export async function disconnectPostgres(databaseName: string): Promise<void> {
    const dataSource = connections.get(databaseName);
    if (!dataSource) return;
    await dataSource.destroy();
    connections.delete(databaseName);
}
