import fs from "node:fs";
import path from "node:path";
import { invoiceReminderConfig } from "./config.js";

/**
 * Per-client templates live at templates/{clientId}.ejs; a client without
 * one falls back to templates/default.ejs.
 */
export function getTemplatePathForClient(clientId: string): string {
    const clientTemplatePath = path.join(invoiceReminderConfig.templatesDir, `${clientId}.ejs`);
    if (fs.existsSync(clientTemplatePath)) {
        return clientTemplatePath;
    }
    return invoiceReminderConfig.defaultTemplatePath;
}
