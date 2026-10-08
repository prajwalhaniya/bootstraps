# packages/gmail

Two interchangeable ways to send email from Gmail, both implementing the same `GmailSender` interface — `send(message, clientId): Promise<{ messageId }>` — so an app can swap one for the other without changing call sites.

Each sender is constructed once with a registry of credentials keyed by `clientId` — whatever identifies "which account to send as" in your app (a tenant id, a user id, an account slug). `send(message, clientId)` looks up that entry and sends as that account. One instance can serve many clients at once.

## `GmailAppPasswordSender` — SMTP + app password

For clients that just send from one fixed mailbox each — no Google Cloud project, no OAuth flow. Generate an [app password](https://myaccount.google.com/apppasswords) per Gmail account.

```ts
import { GmailAppPasswordSender } from "@apiforge/gmail";

const sender = new GmailAppPasswordSender({
    "acme-corp": { user: "notifications@acme.example", appPassword: "xxxx xxxx xxxx xxxx" },
    "widget-co": { user: "alerts@widgetco.example", appPassword: "yyyy yyyy yyyy yyyy" },
});

await sender.send({ to: "user@example.com", subject: "Hi", text: "Hello!" }, "acme-corp");
```

## `GmailApiSender` — Google SDK (OAuth2 + Gmail API)

For clients that already did Google's OAuth consent flow and have a refresh token for their sending account.

```ts
import { GmailApiSender } from "@apiforge/gmail";

const sender = new GmailApiSender({
    "acme-corp": {
        googleClientId: "...",
        googleClientSecret: "...",
        refreshToken: "...",
        senderEmail: "notifications@acme.example",
    },
});

await sender.send({ to: "user@example.com", subject: "Hi", text: "Hello!" }, "acme-corp");
```

## Loading credentials from `.env`

For a single-client app, keep the registry small and build it from `.env` (see `.env.example`):

```ts
const sender = new GmailAppPasswordSender({
    default: { user: process.env.GMAIL_USER!, appPassword: process.env.GMAIL_APP_PASSWORD! },
});

await sender.send(message, "default");
```

Both constructors also accept a `Map<string, Credentials>` instead of a plain object, if you're building the registry dynamically.

## `GmailTemplateSender` — EJS templates

Wraps either sender above to render an `.ejs` file into the email body, instead of building `html`/`text` strings by hand:

```ts
import { GmailAppPasswordSender, GmailTemplateSender } from "@apiforge/gmail";

const sender = new GmailTemplateSender(new GmailAppPasswordSender({ "acme-corp": { user, appPassword } }));

await sender.send(
    {
        to: "user@example.com",
        subject: "Reminder",
        templatePath: new URL("./templates/reminder.ejs", import.meta.url).pathname,
        templateData: { name: "Jane" },
    },
    "acme-corp",
);
```

See `apps/invoice-reminder` for a full example (a scheduled job that reads invoices from a spreadsheet and sends EJS-templated reminder emails).
