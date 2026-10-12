export interface ParsedBookFields {
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    price: string;
}

export interface Book extends ParsedBookFields {
    id: number;
    frontCoverPath: string;
    backCoverPath: string;
    createdAt: string;
}

export interface PaginatedBooks {
    books: Book[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
