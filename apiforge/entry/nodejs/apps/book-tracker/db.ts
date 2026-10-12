import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { bookTrackerConfig } from "./config.js";
import type { Book, PaginatedBooks, ParsedBookFields } from "./types.js";

const PAGE_SIZE = 10;

fs.mkdirSync(path.dirname(bookTrackerConfig.dbPath), { recursive: true });

const db = new DatabaseSync(bookTrackerConfig.dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT NOT NULL,
        publisher TEXT NOT NULL,
        price TEXT NOT NULL,
        front_cover_path TEXT NOT NULL,
        back_cover_path TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
`);

interface BookRow {
    id: number;
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    price: string;
    front_cover_path: string;
    back_cover_path: string;
    created_at: string;
}

function rowToBook(row: BookRow): Book {
    return {
        id: row.id,
        title: row.title,
        author: row.author,
        isbn: row.isbn,
        publisher: row.publisher,
        price: row.price,
        frontCoverPath: row.front_cover_path,
        backCoverPath: row.back_cover_path,
        createdAt: row.created_at,
    };
}

export const bookRepository = {
    create(fields: ParsedBookFields & { frontCoverPath: string; backCoverPath: string }): Book {
        const createdAt = new Date().toISOString();
        const insert = db.prepare(`
            INSERT INTO books (title, author, isbn, publisher, price, front_cover_path, back_cover_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const { lastInsertRowid } = insert.run(
            fields.title,
            fields.author,
            fields.isbn,
            fields.publisher,
            fields.price,
            fields.frontCoverPath,
            fields.backCoverPath,
            createdAt,
        );
        return { id: Number(lastInsertRowid), createdAt, ...fields };
    },

    list(query?: string, page = 1): PaginatedBooks {
        const trimmed = query?.trim();
        const where = trimmed
            ? `WHERE title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR publisher LIKE ? ESCAPE '\\'`
            : "";
        const like = trimmed ? `%${trimmed.replace(/[\\%_]/g, "\\$&")}%` : undefined;
        const likeParams = like ? [like, like, like] : [];

        const { count: total } = db.prepare(`SELECT COUNT(*) as count FROM books ${where}`).get(...likeParams) as {
            count: number;
        };
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * PAGE_SIZE;

        const rows = db
            .prepare(`SELECT * FROM books ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
            .all(...likeParams, PAGE_SIZE, offset) as unknown as BookRow[];

        return { books: rows.map(rowToBook), page: safePage, pageSize: PAGE_SIZE, total, totalPages };
    },
};
