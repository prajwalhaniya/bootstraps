import type { ParsedBookFields } from "./types.js";

const ISBN_LABELED_RE = /ISBN(?:-1[03])?[:\s]*([\d- ]{10,20}[\dXx])/i;
const ISBN_13_RE = /\b97[89][- ]?\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?\d\b/;
const ISBN_10_RE = /\b\d{1,5}[- ]?\d{1,7}[- ]?\d{1,7}[- ]?[\dXx]\b/;
const PRICE_RE = /(?:₹|Rs\.?|INR|\$|USD|£|GBP|€|EUR)\s?\d+(?:[.,]\d{1,2})?/i;
const AUTHOR_LINE_RE = /^by\s+(.+)$/i;
const PUBLISHER_LABELED_RE = /published\s+by\s*[:-]?\s*(.+)$/i;
const PUBLISHER_KEYWORD_RE = /\b(press|books?|publishing|publications?|media|house)\b/i;

function cleanLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter((line) => line.length > 1);
}

function extractIsbn(text: string): string {
    const labeled = text.match(ISBN_LABELED_RE);
    if (labeled) return labeled[1].replace(/[^\dXx-]/g, "").trim();

    const isbn13 = text.match(ISBN_13_RE);
    if (isbn13) return isbn13[0].trim();

    const isbn10 = text.match(ISBN_10_RE);
    return isbn10 ? isbn10[0].trim() : "";
}

function extractPrice(text: string): string {
    const match = text.match(PRICE_RE);
    return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function extractPublisher(lines: string[]): string {
    for (const line of lines) {
        const labeled = line.match(PUBLISHER_LABELED_RE);
        if (labeled) return labeled[1].trim();
    }
    return lines.find((line) => PUBLISHER_KEYWORD_RE.test(line) && line.length < 60) ?? "";
}

/**
 * Front covers are the only reliable source for title/author: the line
 * matching "by <name>" marks the author, everything above it is the title.
 * Without that marker, the longest line is taken as the title.
 */
function extractTitleAndAuthor(frontLines: string[]): { title: string; author: string } {
    const authorIndex = frontLines.findIndex((line) => AUTHOR_LINE_RE.test(line));

    if (authorIndex === -1) {
        const title = frontLines.reduce((longest, line) => (line.length > longest.length ? line : longest), "");
        return { title, author: "" };
    }

    const author = frontLines[authorIndex].match(AUTHOR_LINE_RE)?.[1]?.trim() ?? "";
    const title = frontLines.slice(0, authorIndex).join(" ").trim();
    return { title, author };
}

export function parseBookFields(frontText: string, backText: string): ParsedBookFields {
    const frontLines = cleanLines(frontText);
    const backLines = cleanLines(backText);
    const combinedText = `${frontText}\n${backText}`;

    const { title, author } = extractTitleAndAuthor(frontLines);

    return {
        title,
        author,
        isbn: extractIsbn(combinedText),
        publisher: extractPublisher([...backLines, ...frontLines]),
        price: extractPrice(combinedText),
    };
}
