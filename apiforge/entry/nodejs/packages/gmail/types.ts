export interface EmailAttachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
}

export interface EmailMessage {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: EmailAttachment[];
}

export interface EmailSendResult {
    messageId: string;
}

/**
 * `clientId` identifies which registered account to send as — the key each
 * credentials map is keyed by at construction, not a literal field on any
 * one credential.
 */
export interface GmailSender {
    send(message: EmailMessage, clientId: string): Promise<EmailSendResult>;
}

export type CredentialsInput<T> = Record<string, T> | Map<string, T>;

export function toCredentialsMap<T>(input: CredentialsInput<T>): Map<string, T> {
    return input instanceof Map ? input : new Map(Object.entries(input));
}
