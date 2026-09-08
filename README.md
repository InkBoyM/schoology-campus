# SchoologyCompass

An advanced grade calculator for **Schoology** — the same UI and calculators as
[GradeCompass](https://github.com/PurelyAnecdotal/gradecompass) (grade chart, Hypothetical
Mode, target-grade calculator, category breakdown, new-assignment tracking), rebuilt to read
grades from Schoology via a backend built on [schoology-cli](https://github.com/ko6lvm/schoology-cli).

> Trademark note: per the GradeCompass license terms, public hosts must not use the
> GradeCompass name or icons. This port is renamed to **SchoologyCompass** with its own
> branding. Upstream UI code remains MIT-licensed; see `LICENSE.txt` and attribution below.

## How it works

```
Schoology  --(Playwright session, your machine)-->  backend/server.py (FastAPI)
                                                        |  POST /api/grades/fetch
                                                        v
SvelteKit frontend (this repo, GradeCompass UI)  <--  JSON (schoology-cli shape)
```

Three ways to load grades (login page):

1. **Live backend (recommended for daily use).** Run the backend on your own computer; it
   opens Schoology (Google SSO once, session persists in `backend/.browser_profile/`).
2. **Upload `grades.json` (no backend needed).** Export from schoology-cli, upload in the
   login page. Fully offline.
3. **Demo.** Built-in sample data, no login.

## Publish to GitHub

```bash
cd schoology-compass
git remote add origin https://github.com/YOUR-USERNAME/schoology-compass.git
git branch -M main
git push -u origin main
```

## Host on Koyeb (public link anyone can use)

The repo ships a `Dockerfile`: Koyeb builds it and runs one container where
FastAPI serves both the API and the static site on `$PORT`.

1. Push to GitHub (above).
2. In Koyeb: **Create Service → GitHub** → pick the repo → **Builder: Dockerfile**.
3. Expose port **8000** with route `/:8000` (Koyeb sets `$PORT` automatically).
4. Health check path: `/api/health`. Nano instance is enough. Deploy.

How login works on the hosted site: a server can't complete anyone's Schoology
SSO, so visitors use the **one-click bookmarklet** on the `/import` page (reads
the grades page in their own logged-in browser tab — passwords/sessions never
touch the server) or upload a saved grades page / `grades.json`. All grade data
stays in each visitor's browser localStorage; the server stores nothing.

> Local live-browser mode still exists for personal use (see Quick start), but
> it only works when the backend runs on your own computer.

## Local development (your own machine)

### Easiest (Windows): double-click launchers

1. Double-click **`start-backend.bat`** — a window opens serving `http://127.0.0.1:8000`.
   **Keep it open.** If it closes immediately or shows an error, read the error text.
2. Double-click **`start-frontend.bat`**, open the URL it prints (e.g. `http://localhost:5180`).
3. On the `/login` page, press **Test** — you want "Backend reachable ✓" — then **Connect to Schoology**.

Check the backend is up anytime: open http://127.0.0.1:8000/api/health in your browser,
expect `{"status":"ok"}`. If the login page says "not reachable" but health loads fine,
make sure the Backend URL field is exactly `http://127.0.0.1:8000` (no trailing slash).

### Manual (any OS)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
uvicorn server:app --port 8000
```

API: `GET /api/health`, `POST /api/grades/fetch`, `POST /api/grades/parse-html`,
`POST /api/courses`, `POST /api/assignments`, `POST /api/assignment-detail`,
`GET /api/sample-grades`.

First login: call `/api/grades/fetch` with `{"base_url": "https://YOUR-DISTRICT.schoology.com",
"headless": false}` once so you can complete Google SSO in the visible window. Later runs
can use `"headless": true`.

### 2. Frontend

```bash
npm install
npm run build      # one-time (takes ~2 min), rebuild after any code change
npm run preview    # http://localhost:5180 (stable production server)
```

For development with hot-reload instead: `npm run dev`.

Open `/login`: connect to the backend, upload a file, or try the demo.

### Offline export (no backend)

```bash
git clone https://github.com/ko6lvm/schoology-cli.git
pip install -r schoology-cli/requirements.txt
python schoology-cli/grades.py --json > grades.json
# then upload grades.json on the /login page
```

## What's the same as GradeCompass

- Course list with letter + percentage, progress bars, new-assignment badges
- Course detail: grade chart, category breakdown table, assignment tabs per category,
  per-assignment grade impact, comments/descriptions, unseen tracking
- Hypothetical Mode (edit scores, add hypothetical assignments, reset)
- Target Grade Calculator
- Report-period switcher (maps to Schoology grading periods, e.g. `26-27 T1`)
- Dark mode, PWA install, localStorage caching

## What's different

- Data source is Schoology (`grades.py` JSON shape), not StudentVUE SOAP. See
  `src/lib/schoology.ts` for parsing (`"A+ ( 99.07% )"`, `"10 / 10"`, weights, due dates).
- Schoology periods are per-course; the switcher shows the union of period titles.
- No attendance / documents / mail / student-info pages (Schoology backend doesn't expose
  them); those routes show a "not available" notice.
- Teacher/room fields aren't in the Schoology gradebook report, so course cards show the
  course ID instead.
- Session = cached grades JSON in localStorage (`schoology-compass-1`), not portal password.

## Project layout

```
backend/
  server.py            FastAPI wrapper (live fetch + parse + assignments)
  requirements.txt
  sample_grades.json   demo data (same shape as grades.py --json)
  schoology/
    grades.py          from schoology-cli (unmodified logic)
    assignments.py     from schoology-cli (unmodified logic)
src/lib/
  schoology.ts            Schoology JSON types + parsers + GradeCompass mapping
  schoologyCatalog.svelte.ts  session store (backend/upload/demo + localStorage)
  demo/schoology-demo.json    frontend demo copy of sample data
  grades/assignments.ts       GradeCompass calculators (unchanged, reused as-is)
src/routes/
  login/                  backend-connect + file-upload + demo
  (authed)/grades/        course list + course detail (same UI as GradeCompass)
```

## Attribution

- UI and grade-calculation logic: [PurelyAnecdotal/gradecompass](https://github.com/PurelyAnecdotal/gradecompass) (MIT).
- Schoology fetching/parsing: [ko6lvm/schoology-cli](https://github.com/ko6lvm/schoology-cli)
  (`backend/schoology/grades.py`, `backend/schoology/assignments.py`).
