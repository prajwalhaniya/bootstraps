# packages/postgres

A thin TypeORM connection helper shared by every app under `apps/`. It only connects — each app owns its own entities (models) and queries.

```ts
// apps/my-api/models/item.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Item {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar" })
    name!: string;
}
```

Always pass an explicit `type` to `@Column(...)` (as above), rather than relying on TypeORM to infer it from the TypeScript type. `pnpm run dev` runs on `tsx`, which transpiles with esbuild — esbuild applies the legacy decorators themselves but does not implement `emitDecoratorMetadata`, so the `design:type` metadata TypeORM would otherwise infer the column type from is never emitted, and `@Column()` without an explicit type throws `ColumnTypeUndefinedError` at runtime.

```ts
// apps/my-api/services/index.ts
import { connectPostgres } from "@apiforge/postgres";
import { Item } from "../models/item.entity.js";

const dataSource = await connectPostgres({
    databaseName: "my_api",
    entities: [Item],
});

const itemRepository = dataSource.getRepository(Item);
```

`connectPostgres` reads `POSTGRES_HOST` / `POSTGRES_PORT` / `POSTGRES_USER` / `POSTGRES_PASSWORD` from the environment (see `.env.example`) and caches the connection per `databaseName`, so calling it again elsewhere in the same app reuses the existing `DataSource` instead of re-initializing it.
