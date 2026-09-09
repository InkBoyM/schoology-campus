# SchoologyCompass

An advanced grade calculator for **Schoology** — the same UI and calculators as
[GradeCompass](https://github.com/PurelyAnecdotal/gradecompass) (grade chart, Hypothetical
Mode, target-grade calculator, category breakdown, new-assignment tracking), rebuilt to read
grades from Schoology.

> Trademark note: per the GradeCompass license terms, public hosts must not use the
> GradeCompass name or icons. This port is renamed to **SchoologyCompass** with its own
> branding. Upstream UI code remains MIT-licensed; see `LICENSE.txt` and attribution below.

## How it works

```
 Schoology grades page (visitor's own logged-in tab)
        |  bookmarklet (static/bookmarklet.js) reads the rendered gradebook
        v
 /import page  -->  grades JSON  -->  localStorage  -->  GradeCompass UI
```

There is exactly one way to load grades: the **one-click bookmarklet** on the
`/import` page. It reads the gradebook already open in the visitor's browser —
no password is typed, nothing is sent to any server. All grade data stays in
each visitor's browser localStorage; the server stores nothing.

## Host on Koyeb (public link anyone can use)

The repo ships a `Dockerfile`: Koyeb builds it and runs one container where
FastAPI serves both the API and the static site on `$PORT`.

1. In Koyeb: **Create Service → GitHub** → pick this repo → **Builder: Dockerfile**.
2. Expose port **8000** with route `/:8000` (Koyeb sets `$PORT` automatically).
3. Health check path: `/api/health`. Nano instance is enough. Deploy.

## Local run (your own machine)

### Easiest (Windows): double-click launchers

1. Double-click **`start-all.bat`** — two windows open (backend + frontend).
   **Keep both open.**
2. Open **`http://localhost:5180/`** → Import from Schoology.

Check the backend is up anytime: open http://127.0.0.1:8000/api/health in your browser,
expect `{"status":"ok"}`.

### Manual (any OS)

Backend (serves API + static frontend on `$PORT`, defaults to 8000):

```bash
pip install -r backend/requirements.txt
PORT=8000 uvicorn server:app --app-dir backend --host 0.0.0.0 --port $PORT
```

Frontend (static build, rebuild after any `src/` or `static/` change):

```bash
npm install
npm run build
npm run preview    # http://localhost:5180
```

For development with hot-reload instead: `npm run dev`.

API: `GET /api/health`, `POST /api/grades/parse-html`,
`GET /api/sample-grades`. (Live Playwright endpoints from schoology-cli remain
for local power use and answer `501` where no browsers are installed.)

## What's the same as GradeCompass

- Course list with letter + percentage, progress bars, new-assignment badges,
  drag-to-reorder classes
- Course detail: grade chart, category breakdown table, assignment tabs per category,
  per-assignment grade impact, comments, unseen tracking
- Hypothetical Mode (edit scores, add hypothetical assignments, reset)
- Target Grade Calculator
- Report-period switcher (maps to Schoology grading periods, e.g. `26-27 T1`)
- Dark mode, PWA install, localStorage caching

## What's different

- Data source is the Schoology grades page via bookmarklet, not StudentVUE SOAP. See
  `static/bookmarklet.js` (scraper) and `src/lib/schoology.ts` (parsing:
  `"A+ ( 99.07% )"`, `"1.78 / 2"`, weights, due dates).
- Schoology periods are per-course; the switcher shows the union of period titles.
- No attendance / documents / mail / student-info pages; those routes show a
  "not available" notice.
- Teacher/room fields aren't in the Schoology gradebook report, so course cards show the
  course ID instead.
- Session = imported grades JSON in localStorage (`schoology-compass-1`), not portal password.

## Project layout

```
backend/
  server.py            FastAPI (API + static frontend, same origin)
  requirements.txt         slim deploy deps (no browsers needed)
  requirements-local.txt   local live-browser mode deps
  sample_grades.json   demo data (same shape as schoology-cli grades.py --json)
  schoology/
    grades.py          from schoology-cli (gradebook parse + fetch)
    assignments.py     from schoology-cli (assignments fetch)
static/
  bookmarklet.js       one-click Schoology grades scraper (runs in visitor's tab)
src/lib/
  schoology.ts                Schoology JSON types + parsers + GradeCompass mapping
  schoologyCatalog.svelte.ts  session store (import + localStorage + custom order)
  grades/assignments.ts       GradeCompass calculators (reused, hardened)
  grades/chartData.ts         chart bucketing (dated timeline + sequential fallback)
src/routes/
  import/               bookmarklet install + hash import receiver
  login/                single import call-to-action
  (authed)/grades/      course list (draggable) + course detail (same UI as GradeCompass)
Dockerfile             two-stage build (Node static SPA + Python runtime) for Koyeb
```

## Attribution

- UI and grade-calculation logic: [PurelyAnecdotal/gradecompass](https://github.com/PurelyAnecdotal/gradecompass) (MIT).
- Schoology fetching/parsing: [ko6lvm/schoology-cli](https://github.com/ko6lvm/schoology-cli)
  (`backend/schoology/grades.py`, `backend/schoology/assignments.py`).
