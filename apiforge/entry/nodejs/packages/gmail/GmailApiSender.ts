import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { toCredentialsMap, type CredentialsInput, type EmailAttachment, type EmailMessage, type EmailSendResult, type GmailSender } from "./types.js";

export interface GmailApiCredentials {
    /** The Google OAuth2 client's id (from Google Cloud Console), not the `clientId` this sender is looked up by. */
    googleClientId: string;
    googleClientSecret: string;
    refreshToken: string;
    senderEmail: string;
    redirectUri?: string;
}

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * Sends Gmail messages through the Gmail API using an OAuth2 client — a
 * Google Cloud project's client ID/secret plus a refresh token for the
 * sending account. Use this when a client already did the Google OAuth
 * consent flow and you're holding a refresh token for their account.
 *
 * Takes a `clientId -> credentials` registry at construction; `send(message,
 * clientId)` looks up that clientId's Google credentials and sends through
 * that account. One instance can serve many clients, each with their own
 * Google Cloud OAuth client and sending account.
 */
export class GmailApiSender implements GmailSender {
    private readonly credentials: Map<string, GmailApiCredentials>;
    private readonly oauthClients = new Map<string, OAuth2Client>();

    constructor(credentials: CredentialsInput<GmailApiCredentials>) {
        this.credentials = toCredentialsMap(credentials);
    }

    async send(message: EmailMessage, clientId: string): Promise<EmailSendResult> {
        const creds = this.credentials.get(clientId);
        if (!creds) {
            throw new Error(`GmailApiSender has no credentials registered for clientId "${clientId}"`);
        }

        const oauth2Client = this.getOAuthClient(clientId, creds);
        const raw = await this.buildRawMessage(message, creds.senderEmail);
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
        });

        return { messageId: response.data.id ?? "" };
    }

    private getOAuthClient(clientId: string, creds: GmailApiCredentials): OAuth2Client {
        const cached = this.oauthClients.get(clientId);
        if (cached) return cached;

        const oauth2Client = new google.auth.OAuth2(creds.googleClientId, creds.googleClientSecret, creds.redirectUri);
        oauth2Client.setCredentials({ refresh_token: creds.refreshToken });
        this.oauthClients.set(clientId, oauth2Client);
        return oauth2Client;
    }

    private buildRawMessage(message: EmailMessage, senderEmail: string): Promise<string> {
        const composer = new MailComposer({
            from: senderEmail,
            to: message.to,
            cc: message.cc,
            bcc: message.bcc,
            subject: message.subject,
            text: message.text,
            html: message.html,
            attachments: message.attachments as EmailAttachment[] | undefined,
        });

        return new Promise((resolve, reject) => {
            composer.compile().build((err: Error | null, buffer: Buffer) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
            });
        });
    }
}
