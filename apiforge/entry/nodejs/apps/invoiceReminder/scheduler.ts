import { logger } from "../../common/utils/logger.js";
import { invoiceReminderConfig } from "./config.js";
import { readClientInvoices } from "./excelReader.js";
import { sendReminders } from "./emailService.js";

export const schedulerState = {
    intervalHours: invoiceReminderConfig.intervalHours,
    lastRunAt: null as string | null,
    nextRunAt: null as string | null,
};

async function runOnce(): Promise<void> {
    schedulerState.lastRunAt = new Date().toISOString();
    try {
        const clientInvoices = await readClientInvoices(invoiceReminderConfig.invoicesDir);
        for (const clientInvoice of clientInvoices) {
            await sendReminders(clientInvoice);
        }
    } catch (err) {
        logger.error(`invoice-reminder: run failed: ${(err as Error).message}`);
    } finally {
        schedulerState.nextRunAt = new Date(
            Date.now() + schedulerState.intervalHours * 60 * 60 * 1000,
        ).toISOString();
    }
}

export function startInvoiceReminderScheduler(): void {
    const intervalMs = schedulerState.intervalHours * 60 * 60 * 1000;
    logger.info(`invoice-reminder: checking invoices every ${schedulerState.intervalHours}h`);

    void runOnce();
    setInterval(runOnce, intervalMs);
}
