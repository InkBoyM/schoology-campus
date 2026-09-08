"""
SchoologyCompass backend — FastAPI service.

Two modes:

LOCAL (full power, single user, your own machine):
    pip install -r backend/requirements-local.txt
    playwright install chromium
    uvicorn server:app --app-dir backend --port 8000
Live Playwright endpoints (/api/grades/fetch, /api/courses, ...) drive a
browser on YOUR machine; first login opens a visible window for SSO.

HOSTED (multi-user, e.g. Koyeb — same container serves API + frontend):
    pip install -r backend/requirements.txt
    PORT=8000 uvicorn server:app --app-dir backend --host 0.0.0.0 --port $PORT
A cloud server cannot complete anyone's SSO login, so live browser endpoints
answer 501 there. Hosted users import grades instead: one-click bookmarklet
(static/bookmarklet.js -> /import page) or saved-HTML upload
(POST /api/grades/parse-html). No passwords or sessions ever touch the server;
all grade data stays in each visitor's browser (localStorage).
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))

from schoology import assignments as asg  # noqa: E402 (needs playwright pkg; browsers only for live fetch)
from schoology import grades as grd  # noqa: E402

app = FastAPI(title="SchoologyCompass API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _live_unavailable_error(e: Exception) -> HTTPException | None:
    """Map missing-browser Playwright errors to a helpful 501."""
    msg = str(e)
    if "Executable doesn't exist" in msg or "playwright install" in msg.lower():
        return HTTPException(
            status_code=501,
            detail=(
                "Live browser fetch is unavailable on this server. "
                "Use the one-click Schoology import (bookmarklet) or upload a saved "
                "grades page instead. (Technical detail: Playwright browsers are not installed.)"
            ),
        )
    return None


# ---------------------------------------------------------------- models ---

class GradesFetchRequest(BaseModel):
    base_url: str = Field(default="https://fuhsd.schoology.com",
                          description="e.g. https://your-district.schoology.com")
    headless: bool = True
    timeout_seconds: int = 120


class GradesParseRequest(BaseModel):
    html: str


class CoursesRequest(BaseModel):
    base_url: str = "https://fuhsd.schoology.com"
    headless: bool = True
    timeout_seconds: int = 120


class CourseAssignmentsRequest(BaseModel):
    course: Union[str, int, Dict[str, Any]]
    base_url: str = "https://fuhsd.schoology.com"
    fetch_details: bool = True
    parallel: bool = True
    max_workers: int = 2
    headless: bool = True
    timeout_seconds: int = 120


class AssignmentDetailRequest(BaseModel):
    assignment: Union[str, int]
    base_url: str = "https://fuhsd.schoology.com"
    headless: bool = True
    timeout_seconds: int = 120


def _grades_url(base_url: str) -> str:
    return base_url.rstrip("/") + "/grades/grades"


# -------------------------------------------------------------- endpoints ---

@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "service": "schoology-compass"}


@app.post("/api/grades/fetch")
def api_grades_fetch(req: GradesFetchRequest) -> List[Dict[str, Any]]:
    """Live-fetch the full Schoology gradebook report (LOCAL mode only)."""
    try:
        return grd.fetch_grades(
            url=_grades_url(req.base_url),
            headless=req.headless,
            timeout_seconds=req.timeout_seconds,
            print_logs=False,
        )
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise (_live_unavailable_error(e)
               or HTTPException(status_code=500, detail=f"grades fetch failed: {e}"))


@app.post("/api/grades/parse-html")
def api_grades_parse_html(req: GradesParseRequest) -> List[Dict[str, Any]]:
    """Parse a saved Schoology /grades/grades HTML page (no browser needed)."""
    try:
        return grd.parse_grades_html(req.html)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"parse failed: {e}")


@app.post("/api/courses")
def api_courses(req: CoursesRequest) -> List[Dict[str, Any]]:
    """List enrolled courses (LOCAL mode only)."""
    try:
        return asg.fetch_courses(
            base_url=req.base_url,
            headless=req.headless,
            timeout_seconds=req.timeout_seconds,
            print_logs=False,
        )
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise (_live_unavailable_error(e)
               or HTTPException(status_code=500, detail=f"courses fetch failed: {e}"))


@app.post("/api/assignments")
def api_assignments(req: CourseAssignmentsRequest) -> Dict[str, Any]:
    """Course assignments with details (LOCAL mode only)."""
    try:
        return asg.fetch_course_assignments(
            course=req.course,
            fetch_details=req.fetch_details,
            parallel=req.parallel,
            max_workers=req.max_workers,
            base_url=req.base_url,
            headless=req.headless,
            timeout_seconds=req.timeout_seconds,
            print_logs=False,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise (_live_unavailable_error(e)
               or HTTPException(status_code=500, detail=f"assignments fetch failed: {e}"))


@app.post("/api/assignment-detail")
def api_assignment_detail(req: AssignmentDetailRequest) -> Dict[str, Any]:
    """Single assignment details (LOCAL mode only)."""
    try:
        return asg.fetch_assignment_details(
            req.assignment,
            base_url=req.base_url,
            headless=req.headless,
            timeout_seconds=req.timeout_seconds,
            print_logs=False,
        )
    except Exception as e:  # noqa: BLE001
        raise (_live_unavailable_error(e)
               or HTTPException(status_code=500, detail=f"assignment fetch failed: {e}"))


@app.get("/api/sample-grades")
def api_sample_grades() -> List[Dict[str, Any]]:
    """Demo data (same shape as schoology-cli grades.py output). No login needed."""
    import json

    sample_path = os.path.join(os.path.dirname(__file__), "sample_grades.json")
    with open(sample_path, encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------- static frontend (hosted mode) ---

def _frontend_dir() -> str | None:
    """Location of the `vite build` output (`build/` next to the project root)."""
    override = os.environ.get("FRONTEND_DIR")
    if override and os.path.isdir(override):
        return override
    candidate = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "build"))
    return candidate if os.path.isdir(candidate) else None


_FRONTEND_DIR = _frontend_dir()

if _FRONTEND_DIR:
    # SvelteKit static assets (JS/CSS under /_app, plus root files like favicon).
    app.mount("/_app", StaticFiles(directory=os.path.join(_FRONTEND_DIR, "_app")), name="app-assets")

    @app.get("/bookmarklet.js")
    def bookmarklet() -> FileResponse:
        return FileResponse(os.path.join(_FRONTEND_DIR, "bookmarklet.js"),
                            media_type="application/javascript")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        """Serve static files, falling back to index.html for SPA routes."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="unknown API route")
        candidate = os.path.join(_FRONTEND_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIR, "index.html"), media_type="text/html")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
