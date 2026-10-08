import nodemailer, { type Transporter } from "nodemailer";
import { toCredentialsMap, type CredentialsInput, type EmailMessage, type EmailSendResult, type GmailSender } from "./types.js";

export interface GmailAppPasswordCredentials {
    user: string;
    appPassword: string;
}

/**
 * Sends Gmail messages over SMTP using a mailbox's app password
 * (https://myaccount.google.com/apppasswords) — the simplest option when a
 * client just needs to send from one fixed address, with no Google Cloud
 * project or OAuth flow required.
 *
 * Takes a `clientId -> { user, appPassword }` registry at construction;
 * `send(message, clientId)` looks up that clientId's credentials and sends
 * as that mailbox. One instance can serve many clients, each with their own
 * Gmail account.
 */
export class GmailAppPasswordSender implements GmailSender {
    private readonly credentials: Map<string, GmailAppPasswordCredentials>;
    private readonly transporters = new Map<string, Transporter>();

    constructor(credentials: CredentialsInput<GmailAppPasswordCredentials>) {
        this.credentials = toCredentialsMap(credentials);
    }

    async send(message: EmailMessage, clientId: string): Promise<EmailSendResult> {
        const creds = this.credentials.get(clientId);
        if (!creds) {
            throw new Error(`GmailAppPasswordSender has no credentials registered for clientId "${clientId}"`);
        }

        const transporter = this.getTransporter(clientId, creds);
        const info = await transporter.sendMail({
            from: creds.user,
            to: message.to,
            cc: message.cc,
            bcc: message.bcc,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments,
        });

        return { messageId: info.messageId };
    }

    private getTransporter(clientId: string, creds: GmailAppPasswordCredentials): Transporter {
        const cached = this.transporters.get(clientId);
        if (cached) return cached;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: creds.user, pass: creds.appPassword },
        });
        this.transporters.set(clientId, transporter);
        return transporter;
    }
}
