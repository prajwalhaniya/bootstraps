import ejs from "ejs";
import type { EmailMessage, EmailSendResult, GmailSender } from "./types.js";

export interface TemplatedEmailMessage extends Omit<EmailMessage, "html" | "text"> {
    /** Absolute path to an .ejs template; rendered to the email's html body. */
    templatePath: string;
    templateData?: Record<string, unknown>;
}

/**
 * Wraps any `GmailSender` (app-password or API-based) to render an EJS
 * template into the email body before sending, so apps can keep their email
 * copy in a template file instead of building html strings by hand.
 */
export class GmailTemplateSender {
    constructor(private readonly sender: GmailSender) {}

    async send(message: TemplatedEmailMessage, clientId: string): Promise<EmailSendResult> {
        const { templatePath, templateData, ...rest } = message;
        const html = await ejs.renderFile(templatePath, templateData ?? {});
        return this.sender.send({ ...rest, html }, clientId);
    }
}
