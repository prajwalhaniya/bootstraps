# invoice-reminder

Reads invoice spreadsheets on a schedule and emails a reminder for every unpaid invoice, using `packages/gmail`.

## How it works

On server startup (`routes/index.ts` import triggers it), `scheduler.ts` runs the job once immediately, then every `INVOICE_REMINDER_INTERVAL_HOURS` hours (default `4`):

1. `excelReader.ts` scans `invoices/` for `*.xlsx` files.
2. Each file must be named **`{clientId}_{file-name}.xlsx`** — e.g. `acme_october.xlsx` has `clientId = "acme"`. `clientId` is also the lookup key into the Gmail credentials registry (see below), so each client sends from their own Gmail account.
3. Each sheet's rows become `InvoiceRow`s; rows with `Status` other than `Paid` get a reminder.
4. `emailService.ts` renders `templates/reminder.ejs` for each due invoice and sends it via `GmailTemplateSender` (from `packages/gmail`).

## Spreadsheet format

Header row, in any column order:

| Invoice Number | Customer Name | Customer Email | Amount Due | Due Date | Status |
|---|---|---|---|---|---|
| INV-1001 | John Doe | john@example.com | 250 | 2026-10-01 | Unpaid |

A sample is at `sample-data/acme_sample-invoices.xlsx` — copy it into `invoices/` (renamed to match a real `clientId`) to try the app end-to-end. Real client spreadsheets go in `invoices/` and are gitignored (see the project's `.gitignore`) — only the sample is committed.

## Configuration (`.env`, see `.env.example`)

- `INVOICE_REMINDER_INTERVAL_HOURS` — how often to check the sheets (default `4`).
- `INVOICE_REMINDER_GMAIL_CREDENTIALS` — JSON mapping each `clientId` to the Gmail app password it sends reminders from:
  ```json
  {"acme": {"user": "notifications@acme.example", "appPassword": "xxxx xxxx xxxx xxxx"}}
  ```
- `INVOICE_REMINDER_INVOICES_DIR` — override the default `invoices/` directory, if needed.

## Routes

- `GET /app/js/invoice-reminder/api/status` — `{ intervalHours, lastRunAt, nextRunAt }`.

## Editing the email

Edit `templates/reminder.ejs`; it receives one local, `invoice` (an `InvoiceRow`).
