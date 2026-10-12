#!/usr/bin/env python3
"""Regenerate the directory widget without changing the public JSON schema.

The published directory asset is intentionally a bare JSON array. This script refuses
object wrappers so a local regeneration cannot silently break the live widget contract.
It refreshes the 40-record visible fallback inside the full HTML source, then mirrors
that full widget into marked regions of jobs.html and jobs-v2.html.
"""
import json
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA_PATH = Path(os.environ.get("GSF_DIRECTORY_DATA", HERE / "ca-fire-departments.json"))
PAGES_DIR = Path(os.environ.get("GSF_PAGES_DIR", HERE.parent / "source"))
TOOL_PATH = PAGES_DIR / "tool-department-directory.html"
JOBS_BEGIN = "<!-- BEGIN GENERATED DIRECTORY WIDGET -->"
JOBS_END = "<!-- END GENERATED DIRECTORY WIDGET -->"


def load_departments(path=DATA_PATH):
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise TypeError("ca-fire-departments.json must stay a bare JSON array")
    if not rows:
        raise ValueError("directory array is empty")
    required = {"name", "county", "region", "emt", "medic", "fctc"}
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise TypeError(f"directory row {index} is not an object")
        missing = sorted(required - set(row))
        if missing:
            raise ValueError(f"directory row {index} missing {', '.join(missing)}")
        if row.get("fctc") not in {"yes", "no", "unverified"}:
            raise ValueError(f"directory row {index} has invalid fctc value")
    return rows


def source_note(rows):
    evidence = sum(bool(row.get("evidence_url")) for row in rows)
    return (
        f"{len(rows)} California fire-agency records, including contract-served agencies. "
        "The roster is based on the State Fire Marshal FDID list; FCTC status comes "
        "from the official participating-departments roster. Each card shows the FCTC "
        f"basis and check date. {evidence} cards include a recorded requirements source. "
        "Not confirmed means the public evidence did not establish yes or no. A current "
        "recruitment bulletin always outranks this directory."
    )


def update_tool(rows, path=TOOL_PATH):
    path = Path(path)
    html = path.read_text(encoding="utf-8")
    fallback = json.dumps(rows[:40], ensure_ascii=False, separators=(",", ":"))
    html, count = re.subn(
        r"    var DEPTS = \[.*?\];\s*// partial list, shown only if the fetch fails",
        "    var DEPTS = " + fallback + ";   // partial list, shown only if the fetch fails",
        html,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("could not replace the directory fallback in " + str(path))
    html, count = re.subn(
        r'<p class="d-note">.*?</p>',
        '<p class="d-note">' + source_note(rows) + '</p>',
        html,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("could not replace the directory source note in " + str(path))
    path.write_text(html, encoding="utf-8", newline="\n")
    return html


def sync_jobs(tool_html, pages_dir=PAGES_DIR):
    block = JOBS_BEGIN + "\n" + tool_html.strip() + "\n" + JOBS_END
    for name in ("jobs.html", "jobs-v2.html"):
        path = Path(pages_dir) / name
        page = path.read_text(encoding="utf-8")
        page, count = re.subn(
            re.escape(JOBS_BEGIN) + r".*?" + re.escape(JOBS_END),
            lambda _match: block,
            page,
            count=1,
            flags=re.S,
        )
        if count != 1:
            raise RuntimeError(f"{name} must contain exactly one generated-directory marker pair")
        path.write_text(page, encoding="utf-8", newline="\n")


def main():
    rows = load_departments()
    tool_html = update_tool(rows)
    sync_jobs(tool_html)
    print(f"wrote {TOOL_PATH} and synced jobs pages with {len(rows)} departments")


if __name__ == "__main__":
    main()
