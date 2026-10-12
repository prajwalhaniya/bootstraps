# book-tracker

A simple way to catalog your books. Take a photo of the front and back cover, and the app reads off the title, author, ISBN, publisher and price for you — you just check it over and save.

## What it does

1. Upload a photo of the front cover and a photo of the back cover.
2. The app reads the text off both photos (plain OCR, not AI) and fills in a form for you.
3. OCR not quite right, or missed something? Click **Fill with AI** to have an AI re-read the covers and fill the form fresh (needs a one-time setup — see below).
4. Check the details, fix anything wrong, and save.
5. Browse your saved books any time, with search and 10 books per page.

Anyone can browse the saved books. Scanning a cover and saving a book needs an API key (see **Who can add books** below).

## Setup

Run the server the normal way (see the main `entry/nodejs` README) — OCR scanning works out of the box, nothing extra needed.

### Environment variables

Settings live in a `.env` file in `entry/nodejs/` (copy `.env.example` to `.env` if you don't have one yet — `cp .env.example .env`). Everything below is optional; without it, the app still works, just without "Fill with AI".

| Variable | Needed when | What to put in it |
|---|---|---|
| `BOOK_TRACKER_DB_PATH` | You want the database saved somewhere other than the default (`apps/book-tracker/data/books.db`) | A file path |
| `BOOK_TRACKER_API_KEYS` | You want people to be able to scan and save books (see **Who can add books** below) | JSON mapping each key to a username, e.g. `{"abc123": "alex", "xyz789": "sam"}` |
| `OPENAI_API_KEY` | Using OpenAI for "Fill with AI" | Your key from https://platform.openai.com/api-keys |
| `GEMINI_API_KEY` | Using Gemini for "Fill with AI" | Your key from https://aistudio.google.com/apikey |
| `BOOK_TRACKER_AI_API_KEY` + `BOOK_TRACKER_AI_BASE_URL` | Using any other AI provider for "Fill with AI" | That provider's key and API address |
| `BOOK_TRACKER_AI_MODEL` | You want a specific model instead of the default, or you're using "any other provider" (then it's required) | A model name, e.g. `gpt-4o-mini` |
| `BOOK_TRACKER_AI_PROVIDER` | You've set more than one of the keys above and need to say which to use | `openai`, `gemini`, or `custom` |

For "Fill with AI", you only need to fill in **one** provider's row (its key, plus `BOOK_TRACKER_AI_BASE_URL`/`BOOK_TRACKER_AI_MODEL` if that row asks for them). Leave the rest blank.

Restart the server after editing `.env`. The **Fill with AI** button then appears automatically on the review page once a key is set — there's nothing to pick or configure in the app itself.

## Who can add books

There's no sign-up or login page. Instead, you (the owner) hand out API keys yourself:

1. Pick a key for each person (any random string works) and add them to `BOOK_TRACKER_API_KEYS` in `.env`, e.g.:
   ```
   BOOK_TRACKER_API_KEYS={"abc123": "alex", "xyz789": "sam"}
   ```
2. Restart the server, then give each person their key.
3. They paste it into the **API key** box at the top of the page and click **Save**. The key is remembered in their browser from then on (nothing is sent anywhere until they actually scan or save a book).
4. With a key saved, they can scan covers and save books — each one gets saved under their username. Without a key, the scan/save forms stay hidden, but they can still browse `books` freely.

## Where things are saved

- Cover photos go in `uploads/`.
- Book details go in a small database file at `data/books.db`.

Both stay on your machine only (not committed to git).

## Pages

- `/app/js/book-tracker/` — upload a book's covers
- `/app/js/book-tracker/books` — view, search, and page through saved books
