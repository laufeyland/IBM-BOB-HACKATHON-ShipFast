# Project Architecture Context

## Tech Stack
- **Language:** JavaScript (Node.js)
- **Framework:** Express 4.x (`~4.16.1`)
- **Template Engine:** EJS (`~2.6.1`)
- **Database:** SQLite via `sqlite3` driver (`^5.0.2`) — raw callback API, no ORM
- **Runtime:** Node.js (version from local environment; no `.nvmrc` present)

## API Routes
| Method | Path | Handler File | Description |
|--------|------|-------------|-------------|
| GET | `/` | `routes/index.js` | List all todos (renders index view) |
| GET | `/active` | `routes/index.js` | List only active (incomplete) todos |
| GET | `/completed` | `routes/index.js` | List only completed todos |
| POST | `/` | `routes/index.js` | Create a new todo |
| POST | `/:id` | `routes/index.js` | Update a todo (title/completed state); deletes if title becomes empty |
| POST | `/:id/delete` | `routes/index.js` | Delete a specific todo |
| POST | `/toggle-all` | `routes/index.js` | Set completed state of all todos |
| POST | `/clear-completed` | `routes/index.js` | Delete all completed todos |

## Database Access Layer
- **Driver:** `sqlite3` (raw callback API — no ORM)
- **Connection config:** `db.js` — opens `./var/db/todos.db` (creates directory via `mkdirp`)
- **Schema:** single table `todos (id INTEGER PRIMARY KEY, title TEXT NOT NULL, completed INTEGER)`
- **Query pattern:** `db.all()` / `db.run()` with inline SQL strings

## Middleware Chain
1. `morgan` (`dev`) — HTTP request logger
2. `express.json()` — JSON body parser
3. `express.urlencoded({ extended: false })` — URL-encoded form body parser
4. `cookie-parser` — Cookie header parser
5. `express.static` — Serves `public/` directory
6. `indexRouter` — Application routes (`/`)
7. 404 handler — Forwards to error handler via `createError(404)`
8. Error handler — Renders `error` view with status code

## Server Entry Point
- **File:** `bin/www`
- **Start command:** `node ./bin/www` (or `npm start`)
- **Default port:** `3000` (via `process.env.PORT || '3000'`)

## Seed / Fixture Mechanism
- No `seeders/`, `fixtures/`, `scripts/`, or `bin/seed` found.
- The benchmark script creates minimal todo records inline if the table is empty, and removes them by stored ID on exit.

## Identified Bottlenecks
- **`SELECT * FROM todos` on every GET request** — `fetchTodos` middleware in `routes/index.js` (line 6) performs an unbounded `SELECT *` on every page render, including `/active` and `/completed` which then filter in JavaScript instead of the DB.
- **No pagination** — all todos are always fetched regardless of dataset size.
- **In-memory filtering** — `GET /active` and `GET /completed` fetch all rows from the DB then filter in JS (lines 31, 37) instead of using a `WHERE completed = ?` SQL clause.
- **Synchronous-style DB access on hot path** — every request blocks on a DB round-trip before responding; no caching layer.
- **No indexes** — the `completed` column has no index, making filtered queries (even if moved to SQL) a full table scan.

## Benchmark Target Routes
1. **GET `/`** — primary hot path; runs `SELECT *` on every request; most representative of overall DB load
2. **GET `/active`** — same `SELECT *` then JS-filters; reveals in-memory filter overhead
3. **GET `/completed`** — same pattern as `/active`
4. **POST `/`** — write path; inserts a new todo; measures write throughput
5. **POST `/toggle-all`** — bulk `UPDATE` affecting all rows; stress-tests write performance under concurrent load
