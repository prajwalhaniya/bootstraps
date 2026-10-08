import { GmailAppPasswordSender, GmailTemplateSender } from "../../packages/gmail/index.js";
import { logger } from "../../common/utils/logger.js";
import { invoiceReminderConfig } from "./config.js";
import { getTemplatePathForClient } from "./templates.js";
import type { ClientInvoices } from "./types.js";

const baseSender = new GmailAppPasswordSender(invoiceReminderConfig.gmailCredentials);
const templateSender = new GmailTemplateSender(baseSender);

export async function sendReminders(clientInvoices: ClientInvoices): Promise<void> {
    const dueInvoices = clientInvoices.invoices.filter((invoice) => invoice.status.toLowerCase() !== "paid");
    const templatePath = getTemplatePathForClient(clientInvoices.clientId);

    for (const invoice of dueInvoices) {
        try {
            await templateSender.send(
                {
                    to: invoice.customerEmail,
                    subject: `Payment reminder: Invoice ${invoice.invoiceNumber}`,
                    templatePath,
                    templateData: { invoice },
                },
                clientInvoices.clientId,
            );
            logger.info(`invoice-reminder: sent reminder for ${invoice.invoiceNumber} to ${invoice.customerEmail}`);
        } catch (err) {
            logger.error(
                `invoice-reminder: failed to send reminder for ${invoice.invoiceNumber} (clientId=${clientInvoices.clientId}): ${(err as Error).message}`,
            );
        }
    }
}
