import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import type { ClientInvoices, InvoiceRow } from "./types.js";

const COLUMNS = ["Invoice Number", "Customer Name", "Customer Email", "Amount Due", "Due Date", "Status"] as const;
type Column = (typeof COLUMNS)[number];

function parseClientId(fileName: string): string {
    const separatorIndex = fileName.indexOf("_");
    if (separatorIndex <= 0) {
        throw new Error(`Invoice file "${fileName}" doesn't match the required "{clientId}_{file-name}.xlsx" pattern`);
    }
    return fileName.slice(0, separatorIndex);
}

function formatCellDate(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value ?? "");
}

async function readWorkbook(filePath: string): Promise<InvoiceRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const columnIndex = new Map<Column, number>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
        const value = typeof cell.value === "string" ? cell.value.trim() : "";
        if ((COLUMNS as readonly string[]).includes(value)) {
            columnIndex.set(value as Column, colNumber);
        }
    });

    const get = (row: ExcelJS.Row, column: Column): unknown => {
        const index = columnIndex.get(column);
        return index ? row.getCell(index).value : undefined;
    };

    const rows: InvoiceRow[] = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const invoiceNumber = get(row, "Invoice Number");
        const customerEmail = get(row, "Customer Email");
        if (!invoiceNumber || !customerEmail) return;

        rows.push({
            invoiceNumber: String(invoiceNumber),
            customerName: String(get(row, "Customer Name") ?? ""),
            customerEmail: String(customerEmail),
            amountDue: Number(get(row, "Amount Due") ?? 0),
            dueDate: formatCellDate(get(row, "Due Date")),
            status: String(get(row, "Status") ?? "").trim(),
        });
    });

    return rows;
}

export async function readClientInvoices(invoicesDir: string): Promise<ClientInvoices[]> {
    let fileNames: string[];
    try {
        fileNames = (await fs.readdir(invoicesDir)).filter((name) => name.endsWith(".xlsx"));
    } catch {
        return [];
    }

    const results: ClientInvoices[] = [];
    for (const fileName of fileNames) {
        const clientId = parseClientId(fileName);
        const invoices = await readWorkbook(path.join(invoicesDir, fileName));
        results.push({ clientId, fileName, invoices });
    }
    return results;
}
