# Bookmark Collection Site — Design Spec

A personal static website for collecting interesting URLs with descriptions and tags. Hosted on GitHub Pages at `zhongdai.github.io`.

## Data Format

Each entry is a separate YAML file in `entries/`. One file per bookmark.

**Example:** `entries/example-site.yaml`

```yaml
url: https://example.com
title: Example Site
description: A short description of why this site is interesting.
tags:
  - tools
  - design
date: 2026-04-04
```

**Required fields:** url, title, description, tags (list), date (YYYY-MM-DD).

File names are arbitrary (must end in `.yaml`). Entries are sorted by date (newest first).

## Project Structure

```
zhongdai.github.io/
├── entries/              # One YAML file per bookmark
├── templates/
│   ├── index.html        # Main page Jinja2 template
│   └── feed.xml          # RSS/Atom feed Jinja2 template
├── static/
│   ├── style.css         # Styles with light/dark theme
│   └── app.js            # Search, tag filter, dark/light toggle
├── build.py              # Static site generator
├── validate.py           # Dead link checker
├── requirements.txt      # pyyaml, jinja2, requests
├── docs/                 # Generated output (GitHub Pages source)
│   ├── index.html
│   ├── feed.xml
│   └── static/
│       ├── style.css
│       └── app.js
└── .github/
    └── workflows/
        ├── build.yml     # Auto-build on push to master
        └── validate.yml  # Dead link check on PRs + weekly
```

## Build Tool — `build.py`

Python script using PyYAML and Jinja2.

**Behavior:**

1. Read all `entries/*.yaml` files
2. Validate each entry has all required fields (url, title, description, tags, date)
3. Exit with error if validation fails, reporting which file and what's missing
4. Sort entries by date (newest first)
5. Collect all unique tags across entries
6. Render `templates/index.html` → `docs/index.html`
7. Render `templates/feed.xml` → `docs/feed.xml`
8. Copy `static/` → `docs/static/`

**Dependencies:** pyyaml, jinja2

## Validation Tool — `validate.py`

Python script using requests library.

**Behavior:**

1. Read all `entries/*.yaml` files
2. Send HTTP HEAD request to each URL (timeout: 10 seconds)
3. Report each URL status: OK (2xx), Redirect (3xx), Broken (4xx/5xx), Timeout, Error
4. Print summary at the end
5. Exit code 0 if all OK/redirect, exit code 1 if any broken/timeout/error

**Dependencies:** pyyaml, requests

## Frontend — Single Page

### Layout

- **Header:** Site title + dark/light toggle button (sun/moon icon)
- **Search bar:** Text input below header. Filters entries in real time as user types. Matches against title, description, and tags.
- **Tag bar:** Row of clickable tag pills showing all available tags. Click to filter by tag. Click again to deselect. Multiple tags can be selected (AND logic). Combined with search (AND).
- **Clear button:** Resets all filters (search text + selected tags).
- **Entry cards:** Grid of cards. Each card shows:
  - Title (linked to the external URL, opens in new tab)
  - Description
  - Date added (subtle, e.g. "Apr 4, 2026")
  - Tag pills
- **Footer:** Minimal — RSS feed link

### Responsive Design

- CSS grid layout
- Mobile (< 640px): single column
- Tablet (640-1024px): 2 columns
- Desktop (> 1024px): 3 columns

### Dark/Light Toggle

- Toggle button in header with sun/moon icon
- CSS custom properties (variables) for theming
- Preference saved in `localStorage`
- On first visit, respects `prefers-color-scheme` media query

### Search + Tag Filtering

All client-side JavaScript, no server needed.

- Search input filters entries by matching text against title, description, and tag names (case-insensitive)
- Tag pills filter entries that have ALL selected tags
- Search and tag filters combine with AND logic
- Filtering hides/shows cards with CSS (no DOM rebuilding)
- Entry count shown (e.g. "Showing 12 of 45 entries")

### RSS Feed

- Standard Atom feed at `docs/feed.xml`
- Entries sorted by date (newest first)
- Each item: title, URL (as link), description (as summary), date
- `<link rel="alternate" type="application/atom+xml">` in HTML head for auto-discovery

## GitHub Actions

### Build Workflow (`.github/workflows/build.yml`)

**Trigger:** Push to master branch (only when `entries/` or `templates/` or `static/` change).

**Steps:**

1. Checkout repo
2. Set up Python
3. Install dependencies from `requirements.txt`
4. Run `python build.py`
5. If `docs/` changed, commit and push the generated files

### Validation Workflow (`.github/workflows/validate.yml`)

**Trigger:** Pull requests + weekly schedule (cron).

**On pull request:**

1. Checkout repo
2. Set up Python
3. Install dependencies
4. Run `python validate.py`
5. Fail the check if exit code is 1

**On weekly schedule:**

1. Same steps as above
2. If dead links found, open a GitHub issue with the report

## Style

- Clean, modern, minimal
- System font stack (no web font loading)
- Subtle borders and shadows on cards
- Smooth transitions for theme toggle and filtering
- No external CSS frameworks — plain CSS with custom properties
