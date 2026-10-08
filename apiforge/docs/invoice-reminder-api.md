# invoiceReminder API

`invoiceReminder` is a Node.js app under `entry/nodejs/apps/invoiceReminder`, mounted on the shared apiforge Node.js server (see `docs/usage.md`). It has no CRUD surface — invoices are processed automatically on a schedule, not via API calls — so its only HTTP endpoint reports that schedule's status.

## Base URL

```
http://localhost:3000/app/js/invoice-reminder/api
```

(`3000` is the default `PORT` for `entry/nodejs`; see its `.env`.)

## Authentication

None. Like every other apiforge app, this endpoint is only as exposed as the shared Node.js server itself.

## Endpoints

### `GET /status`

Reports the invoice-check schedule: when it last ran and when it will run next.

**Request** — no parameters, no body.

```bash
curl http://localhost:3000/app/js/invoice-reminder/api/status
```

**Response** — `200 OK`

| Field | Type | Description |
|---|---|---|
| `intervalHours` | `number` | How often invoices are checked, from `INVOICE_REMINDER_INTERVAL_HOURS` (default `4`). |
| `lastRunAt` | `string \| null` | ISO 8601 timestamp of the last check. `null` only in the instant before the very first run completes. |
| `nextRunAt` | `string \| null` | ISO 8601 timestamp of the next scheduled check. |

```json
{
    "intervalHours": 4,
    "lastRunAt": "2026-10-08T06:36:51.929Z",
    "nextRunAt": "2026-10-08T10:36:51.931Z"
}
```

This endpoint always returns `200` — a failed check (e.g. a bad spreadsheet, an email send failure) is logged server-side and does not affect `/status`; `lastRunAt`/`nextRunAt` still advance on schedule.

## What actually happens on schedule (not an API call)

Every `intervalHours`, starting immediately when the server boots:

1. Every `*.xlsx` file in `apps/invoiceReminder/invoices/` is read. Each file must be named `{clientId}_{file-name}.xlsx`.
2. Rows with `Status` other than `Paid` are treated as due.
3. A reminder email — rendered from `templates/{clientId}.ejs` if that client has one, otherwise `templates/default.ejs` — is sent to each due invoice's `Customer Email`, from the Gmail account registered for that file's `clientId` in `INVOICE_REMINDER_GMAIL_CREDENTIALS`.

Full spreadsheet format, template, and `.env` configuration are documented in `entry/nodejs/apps/invoiceReminder/README.md`.

## Adding a new client

A "client" is just a `clientId` — a key shared by one Gmail credential entry and one or more invoice spreadsheets. There's no endpoint for this; it's two files plus a restart.

1. **Get a Gmail app password** for the account this client should send reminders from: https://myaccount.google.com/apppasswords (requires 2-Step Verification on that Google account).

2. **Register the credentials** in `entry/nodejs/.env`, adding the new `clientId` to the `INVOICE_REMINDER_GMAIL_CREDENTIALS` JSON (don't replace existing clients — it's a map):

   ```json
   {
       "acme": { "user": "notifications@acme.example", "appPassword": "xxxx xxxx xxxx xxxx" },
       "widget-co": { "user": "billing@widgetco.example", "appPassword": "yyyy yyyy yyyy yyyy" }
   }
   ```

3. **Add the spreadsheet** to `entry/nodejs/apps/invoiceReminder/invoices/`, named `{clientId}_{anything}.xlsx` — e.g. `widget-co_invoices.xlsx`. The `{clientId}` prefix must exactly match the key used in step 2. Format: see `entry/nodejs/apps/invoiceReminder/README.md` (or copy `sample-data/acme_sample-invoices.xlsx` as a starting point).

4. **(Optional) Give them their own email template** — add `entry/nodejs/apps/invoiceReminder/templates/{clientId}.ejs` (matching the same `clientId`). Without one, reminders fall back to `templates/default.ejs`. No restart needed for this step — the template is read fresh on every send.

5. **Restart the Node.js server** (`pnpm run dev`/`pnpm start` in `entry/nodejs`) — `.env` is only read at process start, so a new `INVOICE_REMINDER_GMAIL_CREDENTIALS` entry won't be picked up by a running process.

6. **Verify**: the scheduler runs once immediately on restart, so check the server logs for `invoice-reminder: sent reminder for ... to ...` lines for that client, or `GET /status` to confirm `lastRunAt` just advanced. A missing or mismatched `clientId` logs `invoice-reminder: failed to send reminder for ... (clientId=...)` instead of sending.

## Errors

| Status | When |
|---|---|
| `404` | Any path under `/app/js/invoice-reminder/api` other than `/status`. |

There are no `4xx`/`5xx` responses specific to the invoice-checking logic itself, since that logic never runs as part of a request — it runs on its own timer. Per-invoice send failures (bad `clientId`, missing Gmail credentials, SMTP/API errors) are logged via the shared server logger and skip that invoice; they don't surface over HTTP.
