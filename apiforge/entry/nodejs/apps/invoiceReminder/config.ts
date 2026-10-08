import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GmailAppPasswordCredentials } from "../../packages/gmail/index.js";

const appDir = path.dirname(fileURLToPath(import.meta.url));

function parseCredentials(json: string | undefined): Record<string, GmailAppPasswordCredentials> {
    if (!json) return {};

    try {
        return JSON.parse(json);
    } catch {
        throw new Error(
            'INVOICE_REMINDER_GMAIL_CREDENTIALS must be JSON: {"<clientId>": {"user": "...", "appPassword": "..."}}',
        );
    }
}

export const invoiceReminderConfig = {
    invoicesDir: process.env.INVOICE_REMINDER_INVOICES_DIR ?? path.join(appDir, "invoices"),
    templatesDir: path.join(appDir, "templates"),
    defaultTemplatePath: path.join(appDir, "templates", "default.ejs"),
    intervalHours: Number(process.env.INVOICE_REMINDER_INTERVAL_HOURS ?? 4),
    gmailCredentials: parseCredentials(process.env.INVOICE_REMINDER_GMAIL_CREDENTIALS),
};
