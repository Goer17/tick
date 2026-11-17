# Tick

A small personal task manager with a split desktop layout and a dedicated mobile layout.

**Stack:** React + Vite frontend, Express API, JSON file persistence. No database service required.

## Features

- Access-token login (`Authorization: Bearer ...`)
- Time buckets: Today, Tomorrow, This Week, Planned, Done
- Nested lists: lists → sublists → tasks → subtasks
- Important goals: marked tasks appear in the gold strip above every list
- Due dates and repeating tasks (every N days/weeks/months/years)
- Completing a repeating task creates the next occurrence
- Light / Dark / Auto theme (Auto: light 07:00–19:00, dark otherwise)
- Responsive mobile layout: off-canvas lists, horizontal time filters, full-height task sheet
- English UI, monospace typography

## Run

```bash
npm install
export TICK_ACCESS_TOKEN="choose-a-token"
npm run dev:server     # API on http://localhost:3456
npm run dev:web        # Vite on http://localhost:5173
```

For a production build served by Express:

```bash
npm run build
export TICK_ACCESS_TOKEN="choose-a-token"
npm start              # http://0.0.0.0:3456
```

If `TICK_ACCESS_TOKEN` is not set, the development default is `tick-demo-token`. Set a real token for any shared deployment.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `TICK_ACCESS_TOKEN` | `tick-demo-token` | Login token |
| `TICK_PORT` | `3456` | API/static server port |
| `TICK_HOST` | `0.0.0.0` | Bind address |
| `TICK_DATA_DIR` | `server/data` | Persistent JSON location |

Data is stored in `server/data/state.json` (created automatically, mode 600). `server/data/` is gitignored.

## Scripts

```bash
npm run dev:server
npm run dev:web
npm run build
npm start
```

## API

All `/api/*` routes except `/api/health` and `/api/login` require `Authorization: Bearer <TICK_ACCESS_TOKEN>`.

- `GET /api/state`
- `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- `POST /api/todos`, `PATCH /api/todos/:id`, `DELETE /api/todos/:id`

`PATCH /api/todos/:id` accepts `title`, `notes`, `dueDate`, `longTerm`, `repeat`, and `completed`.
