# Bookmark Collection Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static bookmark collection site with search, tag filtering, dark/light theme, RSS feed, and CI/CD automation.

**Architecture:** Python build script reads YAML entry files, renders a single-page site via Jinja2 templates into `docs/`. Client-side JS handles search, tag filtering, and theme toggle. GitHub Actions auto-builds on push and validates links on PRs.

**Tech Stack:** Python 3, PyYAML, Jinja2, requests, vanilla HTML/CSS/JS, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-04-04-bookmark-site-design.md`

---

## File Structure

```
zhongdai.github.io/
├── .gitignore                          # Updated for this project
├── requirements.txt                    # pyyaml, jinja2, requests
├── build.py                            # Static site generator (~80 lines)
├── validate.py                         # Dead link checker (~60 lines)
├── entries/                            # One YAML per bookmark
│   └── example-site.yaml              # Sample entry for testing
├── templates/
│   ├── index.html                      # Main page Jinja2 template
│   └── feed.xml                        # Atom feed Jinja2 template
├── static/
│   ├── style.css                       # Light/dark theme, responsive grid
│   └── app.js                          # Search, tag filter, theme toggle
├── tests/
│   ├── test_build.py                   # Tests for build.py
│   └── test_validate.py                # Tests for validate.py
├── docs/                               # Generated output (GitHub Pages serves this)
│   ├── index.html
│   ├── feed.xml
│   └── static/
│       ├── style.css
│       └── app.js
└── .github/
    └── workflows/
        ├── build.yml                   # Auto-build on push to master
        └── validate.yml                # Link validation on PRs + weekly
```

---

### Task 1: Project Setup

**Files:**
- Modify: `.gitignore`
- Create: `requirements.txt`

- [ ] **Step 1: Update `.gitignore`**

Replace the old Jekyll `.gitignore` with:

```
__pycache__/
*.pyc
.venv/
```

- [ ] **Step 2: Create `requirements.txt`**

```
pyyaml>=6.0
jinja2>=3.1
requests>=2.31
pytest>=8.0
```

- [ ] **Step 3: Set up virtual environment and install**

Run:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 4: Create directory structure**

Run:
```bash
mkdir -p entries templates static tests docs .github/workflows
```

- [ ] **Step 5: Create sample entry**

Create `entries/example-site.yaml`:

```yaml
url: https://example.com
title: Example Site
description: A placeholder entry for testing the build process.
tags:
  - example
date: 2026-04-04
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore requirements.txt entries/example-site.yaml
git commit -m "chore: project setup with requirements and sample entry"
```

---

### Task 2: Build Script — Core Logic

**Files:**
- Create: `build.py`
- Create: `tests/test_build.py`

- [ ] **Step 1: Write failing test for YAML loading and validation**

Create `tests/test_build.py`:

```python
import os
import tempfile
import pytest
from build import load_entries, ValidationError


def _write_yaml(dir_path, filename, content):
    path = os.path.join(dir_path, filename)
    with open(path, "w") as f:
        f.write(content)
    return path


def test_load_valid_entry():
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "test.yaml", """
url: https://example.com
title: Test
description: A test entry.
tags:
  - demo
date: 2026-04-04
""")
        entries = load_entries(d)
        assert len(entries) == 1
        assert entries[0]["title"] == "Test"
        assert entries[0]["url"] == "https://example.com"
        assert entries[0]["tags"] == ["demo"]


def test_load_missing_field_raises():
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "bad.yaml", """
url: https://example.com
title: Missing fields
""")
        with pytest.raises(ValidationError, match="bad.yaml"):
            load_entries(d)


def test_entries_sorted_by_date_newest_first():
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "old.yaml", """
url: https://old.com
title: Old
description: Old entry.
tags:
  - a
date: 2026-01-01
""")
        _write_yaml(d, "new.yaml", """
url: https://new.com
title: New
description: New entry.
tags:
  - b
date: 2026-04-01
""")
        entries = load_entries(d)
        assert entries[0]["title"] == "New"
        assert entries[1]["title"] == "Old"


def test_collect_all_tags():
    from build import collect_tags
    entries = [
        {"tags": ["python", "tools"]},
        {"tags": ["tools", "design"]},
    ]
    tags = collect_tags(entries)
    assert tags == ["design", "python", "tools"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_build.py -v`
Expected: FAIL — `build` module not found

- [ ] **Step 3: Implement `build.py` core logic**

Create `build.py`:

```python
#!/usr/bin/env python3
"""Static site generator for the bookmark collection."""

import glob
import os
import shutil
import sys
from datetime import date

import yaml
from jinja2 import Environment, FileSystemLoader

REQUIRED_FIELDS = ["url", "title", "description", "tags", "date"]
ROOT = os.path.dirname(os.path.abspath(__file__))


class ValidationError(Exception):
    pass


def load_entries(entries_dir):
    """Load and validate all YAML entries from a directory."""
    entries = []
    for filepath in sorted(glob.glob(os.path.join(entries_dir, "*.yaml"))):
        with open(filepath) as f:
            data = yaml.safe_load(f)
        filename = os.path.basename(filepath)
        missing = [k for k in REQUIRED_FIELDS if k not in data]
        if missing:
            raise ValidationError(
                f"{filename}: missing required fields: {', '.join(missing)}"
            )
        if isinstance(data["date"], date):
            data["date"] = data["date"]
        entries.append(data)
    entries.sort(key=lambda e: str(e["date"]), reverse=True)
    return entries


def collect_tags(entries):
    """Collect all unique tags, sorted alphabetically."""
    tags = set()
    for entry in entries:
        tags.update(entry["tags"])
    return sorted(tags)


def build(entries_dir=None, templates_dir=None, static_dir=None, output_dir=None):
    """Build the static site."""
    entries_dir = entries_dir or os.path.join(ROOT, "entries")
    templates_dir = templates_dir or os.path.join(ROOT, "templates")
    static_dir = static_dir or os.path.join(ROOT, "static")
    output_dir = output_dir or os.path.join(ROOT, "docs")

    entries = load_entries(entries_dir)
    tags = collect_tags(entries)

    env = Environment(loader=FileSystemLoader(templates_dir), autoescape=True)

    # Render index.html
    index_template = env.get_template("index.html")
    index_html = index_template.render(entries=entries, tags=tags)
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "index.html"), "w") as f:
        f.write(index_html)

    # Render feed.xml
    feed_template = env.get_template("feed.xml")
    feed_xml = feed_template.render(
        entries=entries,
        build_date=date.today().isoformat(),
    )
    with open(os.path.join(output_dir, "feed.xml"), "w") as f:
        f.write(feed_xml)

    # Copy static files
    static_output = os.path.join(output_dir, "static")
    if os.path.exists(static_output):
        shutil.rmtree(static_output)
    shutil.copytree(static_dir, static_output)

    print(f"Built {len(entries)} entries with {len(tags)} tags into {output_dir}/")


if __name__ == "__main__":
    try:
        build()
    except ValidationError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_build.py -v`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "feat: build script with YAML loading, validation, and tag collection"
```

---

### Task 3: Jinja2 Templates

**Files:**
- Create: `templates/index.html`
- Create: `templates/feed.xml`

- [ ] **Step 1: Create the main page template**

Create `templates/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookmarks</title>
    <link rel="stylesheet" href="static/style.css">
    <link rel="alternate" type="application/atom+xml" title="Bookmarks Feed" href="feed.xml">
</head>
<body>
    <header>
        <h1>Bookmarks</h1>
        <button id="theme-toggle" type="button" aria-label="Toggle dark mode">
            <span class="icon-sun">&#9728;</span>
            <span class="icon-moon">&#9790;</span>
        </button>
    </header>

    <div class="controls">
        <div class="search-bar">
            <input type="text" id="search" placeholder="Search bookmarks..." aria-label="Search bookmarks">
            <button id="clear-filters" type="button">Clear</button>
        </div>
        <div class="tag-bar" id="tag-bar">
            {% for tag in tags %}
            <button class="tag-pill" data-tag="{{ tag }}" type="button">{{ tag }}</button>
            {% endfor %}
        </div>
        <p class="entry-count" id="entry-count"></p>
    </div>

    <main class="card-grid" id="card-grid">
        {% for entry in entries %}
        <article class="card"
                 data-title="{{ entry.title | lower }}"
                 data-description="{{ entry.description | lower }}"
                 data-tags="{{ entry.tags | join(' ') | lower }}">
            <h2><a href="{{ entry.url }}" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a></h2>
            <p class="description">{{ entry.description }}</p>
            <time datetime="{{ entry.date }}">{{ entry.date.strftime('%b %-d, %Y') }}</time>
            <div class="tags">
                {% for tag in entry.tags %}
                <span class="tag-pill">{{ tag }}</span>
                {% endfor %}
            </div>
        </article>
        {% endfor %}
    </main>

    <footer>
        <a href="feed.xml">RSS Feed</a>
    </footer>

    <script src="static/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the Atom feed template**

Create `templates/feed.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <title>Bookmarks</title>
    <link href="https://zhongdai.github.io/" rel="alternate"/>
    <link href="https://zhongdai.github.io/feed.xml" rel="self"/>
    <updated>{{ build_date }}T00:00:00Z</updated>
    <id>https://zhongdai.github.io/</id>
    {% for entry in entries %}
    <entry>
        <title>{{ entry.title }}</title>
        <link href="{{ entry.url }}" rel="alternate"/>
        <id>{{ entry.url }}</id>
        <updated>{{ entry.date }}T00:00:00Z</updated>
        <summary>{{ entry.description }}</summary>
    </entry>
    {% endfor %}
</feed>
```

- [ ] **Step 3: Run build to verify templates render**

Run:
```bash
python build.py
cat docs/index.html | head -5
cat docs/feed.xml | head -5
```
Expected: HTML file starts with `<!DOCTYPE html>`, feed starts with `<?xml`

- [ ] **Step 4: Commit**

```bash
git add templates/
git commit -m "feat: add Jinja2 templates for index page and Atom feed"
```

---

### Task 4: CSS — Light/Dark Theme + Responsive Grid

**Files:**
- Create: `static/style.css`

- [ ] **Step 1: Create the stylesheet**

Create `static/style.css`:

```css
/* === Reset & Base === */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

:root {
    --bg: #ffffff;
    --bg-card: #f9f9f9;
    --text: #1a1a1a;
    --text-muted: #666666;
    --border: #e0e0e0;
    --accent: #2563eb;
    --accent-hover: #1d4ed8;
    --tag-bg: #e8f0fe;
    --tag-text: #1e40af;
    --tag-active-bg: #2563eb;
    --tag-active-text: #ffffff;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    --radius: 8px;
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

[data-theme="dark"] {
    --bg: #0f0f0f;
    --bg-card: #1a1a1a;
    --text: #e5e5e5;
    --text-muted: #999999;
    --border: #333333;
    --accent: #60a5fa;
    --accent-hover: #93bbfd;
    --tag-bg: #1e3a5f;
    --tag-text: #93c5fd;
    --tag-active-bg: #60a5fa;
    --tag-active-text: #0f0f0f;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    transition: background 0.2s, color 0.2s;
}

/* === Header === */
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
}

header h1 {
    font-size: 1.5rem;
    font-weight: 700;
}

#theme-toggle {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--text);
    transition: border-color 0.2s;
}

#theme-toggle:hover {
    border-color: var(--accent);
}

/* Show sun in dark mode, moon in light mode */
.icon-sun { display: none; }
.icon-moon { display: inline; }
[data-theme="dark"] .icon-sun { display: inline; }
[data-theme="dark"] .icon-moon { display: none; }

/* === Controls === */
.controls {
    margin-bottom: 1.5rem;
}

.search-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.search-bar input {
    flex: 1;
    padding: 0.6rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 1rem;
    background: var(--bg-card);
    color: var(--text);
    transition: border-color 0.2s;
}

.search-bar input:focus {
    outline: none;
    border-color: var(--accent);
}

.search-bar button {
    padding: 0.6rem 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-card);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    transition: border-color 0.2s;
}

.search-bar button:hover {
    border-color: var(--accent);
    color: var(--text);
}

.tag-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.tag-pill {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    background: var(--tag-bg);
    color: var(--tag-text);
    border: none;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
}

button.tag-pill:hover {
    background: var(--tag-active-bg);
    color: var(--tag-active-text);
}

button.tag-pill.active {
    background: var(--tag-active-bg);
    color: var(--tag-active-text);
}

.entry-count {
    font-size: 0.85rem;
    color: var(--text-muted);
}

/* === Card Grid === */
.card-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
}

@media (min-width: 640px) {
    .card-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
    .card-grid { grid-template-columns: repeat(3, 1fr); }
}

.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    box-shadow: var(--shadow);
    transition: border-color 0.2s, box-shadow 0.2s;
}

.card:hover {
    border-color: var(--accent);
}

.card.hidden {
    display: none;
}

.card h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.card h2 a {
    color: var(--accent);
    text-decoration: none;
}

.card h2 a:hover {
    text-decoration: underline;
}

.card .description {
    font-size: 0.95rem;
    color: var(--text);
    margin-bottom: 0.5rem;
}

.card time {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.card .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.card .tags .tag-pill {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    cursor: default;
}

/* === Footer === */
footer {
    margin-top: 2rem;
    padding: 1rem 0;
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: 0.85rem;
}

footer a {
    color: var(--accent);
    text-decoration: none;
}

footer a:hover {
    text-decoration: underline;
}
```

- [ ] **Step 2: Run build and verify CSS is copied**

Run:
```bash
python build.py
ls docs/static/style.css
```
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add static/style.css
git commit -m "feat: add CSS with light/dark theme and responsive grid"
```

---

### Task 5: JavaScript — Search, Tag Filter, Theme Toggle

**Files:**
- Create: `static/app.js`

- [ ] **Step 1: Create the JavaScript file**

Create `static/app.js`:

```javascript
(function () {
    "use strict";

    // === Theme Toggle ===
    const toggle = document.getElementById("theme-toggle");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    function setTheme(dark) {
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        localStorage.setItem("theme", dark ? "dark" : "light");
    }

    // Init theme: localStorage > system preference
    const stored = localStorage.getItem("theme");
    if (stored) {
        setTheme(stored === "dark");
    } else {
        setTheme(prefersDark.matches);
    }

    toggle.addEventListener("click", function () {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(!isDark);
    });

    // === Search & Tag Filtering ===
    const searchInput = document.getElementById("search");
    const clearBtn = document.getElementById("clear-filters");
    const tagBar = document.getElementById("tag-bar");
    const cardGrid = document.getElementById("card-grid");
    const entryCount = document.getElementById("entry-count");
    const cards = Array.from(cardGrid.querySelectorAll(".card"));
    const tagButtons = Array.from(tagBar.querySelectorAll(".tag-pill"));
    const totalCount = cards.length;

    let activeTags = new Set();

    function filterCards() {
        var query = searchInput.value.toLowerCase().trim();
        var visibleCount = 0;

        cards.forEach(function (card) {
            var title = card.getAttribute("data-title");
            var description = card.getAttribute("data-description");
            var tags = card.getAttribute("data-tags");
            var text = title + " " + description + " " + tags;

            // Search match
            var matchesSearch = !query || text.indexOf(query) !== -1;

            // Tag match (AND logic)
            var matchesTags = true;
            activeTags.forEach(function (tag) {
                if (tags.indexOf(tag) === -1) {
                    matchesTags = false;
                }
            });

            if (matchesSearch && matchesTags) {
                card.classList.remove("hidden");
                visibleCount++;
            } else {
                card.classList.add("hidden");
            }
        });

        entryCount.textContent = "Showing " + visibleCount + " of " + totalCount + " entries";
    }

    searchInput.addEventListener("input", filterCards);

    tagButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var tag = btn.getAttribute("data-tag");
            if (activeTags.has(tag)) {
                activeTags.delete(tag);
                btn.classList.remove("active");
            } else {
                activeTags.add(tag);
                btn.classList.add("active");
            }
            filterCards();
        });
    });

    clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        activeTags.clear();
        tagButtons.forEach(function (btn) {
            btn.classList.remove("active");
        });
        filterCards();
    });

    // Init count
    filterCards();
})();
```

- [ ] **Step 2: Run build and verify JS is copied**

Run:
```bash
python build.py
ls docs/static/app.js
```
Expected: File exists

- [ ] **Step 3: Open in browser to manually verify**

Run:
```bash
open docs/index.html
```
Expected: Page loads with the sample entry, theme toggle works, search works.

- [ ] **Step 4: Commit**

```bash
git add static/app.js
git commit -m "feat: add client-side search, tag filtering, and theme toggle"
```

---

### Task 6: Dead Link Validator

**Files:**
- Create: `validate.py`
- Create: `tests/test_validate.py`

- [ ] **Step 1: Write failing test for validator**

Create `tests/test_validate.py`:

```python
import os
import tempfile
from unittest.mock import patch, MagicMock
from validate import check_links


def _write_yaml(dir_path, filename, content):
    path = os.path.join(dir_path, filename)
    with open(path, "w") as f:
        f.write(content)
    return path


def test_valid_link_returns_ok():
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "good.yaml", """
url: https://example.com
title: Good
description: Works fine.
tags:
  - test
date: 2026-04-04
""")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch("requests.head", return_value=mock_resp):
            results = check_links(d)
        assert len(results) == 1
        assert results[0]["status"] == "OK"


def test_broken_link_detected():
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "bad.yaml", """
url: https://broken.example.com
title: Broken
description: This is broken.
tags:
  - test
date: 2026-04-04
""")
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        with patch("requests.head", return_value=mock_resp):
            results = check_links(d)
        assert len(results) == 1
        assert results[0]["status"] == "Broken (404)"


def test_timeout_detected():
    import requests as req
    with tempfile.TemporaryDirectory() as d:
        _write_yaml(d, "slow.yaml", """
url: https://slow.example.com
title: Slow
description: Times out.
tags:
  - test
date: 2026-04-04
""")
        with patch("requests.head", side_effect=req.Timeout):
            results = check_links(d)
        assert len(results) == 1
        assert results[0]["status"] == "Timeout"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_validate.py -v`
Expected: FAIL — `validate` module not found

- [ ] **Step 3: Implement `validate.py`**

Create `validate.py`:

```python
#!/usr/bin/env python3
"""Dead link checker for bookmark entries."""

import glob
import os
import sys

import requests
import yaml

REQUIRED_FIELDS = ["url", "title", "description", "tags", "date"]
ROOT = os.path.dirname(os.path.abspath(__file__))


def check_links(entries_dir=None):
    """Check all entry URLs and return a list of results."""
    entries_dir = entries_dir or os.path.join(ROOT, "entries")
    results = []

    for filepath in sorted(glob.glob(os.path.join(entries_dir, "*.yaml"))):
        with open(filepath) as f:
            data = yaml.safe_load(f)

        url = data.get("url", "")
        title = data.get("title", os.path.basename(filepath))

        try:
            resp = requests.head(url, timeout=10, allow_redirects=True)
            if resp.status_code < 300:
                status = "OK"
            elif resp.status_code < 400:
                status = f"Redirect ({resp.status_code})"
            else:
                status = f"Broken ({resp.status_code})"
        except requests.Timeout:
            status = "Timeout"
        except requests.RequestException as e:
            status = f"Error ({e})"

        results.append({"title": title, "url": url, "status": status})

    return results


def main():
    results = check_links()
    has_errors = False

    for r in results:
        icon = "OK" if r["status"] == "OK" else "!!"
        print(f"[{icon}] {r['title']}: {r['status']}")
        print(f"     {r['url']}")
        if r["status"] not in ("OK",) and not r["status"].startswith("Redirect"):
            has_errors = True

    print(f"\n--- {len(results)} links checked ---")
    if has_errors:
        print("FAILED: Some links are broken.")
        sys.exit(1)
    else:
        print("All links OK.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_validate.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add validate.py tests/test_validate.py
git commit -m "feat: add dead link validator with tests"
```

---

### Task 7: GitHub Actions — Build Workflow

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Create the build workflow**

Create `.github/workflows/build.yml`:

```yaml
name: Build Site

on:
  push:
    branches: [master]
    paths:
      - 'entries/**'
      - 'templates/**'
      - 'static/**'
      - 'build.py'

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install pyyaml jinja2

      - name: Build site
        run: python build.py

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/
          git diff --staged --quiet || git commit -m "chore: rebuild site [skip ci]" && git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add build workflow to auto-regenerate site on push"
```

---

### Task 8: GitHub Actions — Validation Workflow

**Files:**
- Create: `.github/workflows/validate.yml`

- [ ] **Step 1: Create the validation workflow**

Create `.github/workflows/validate.yml`:

```yaml
name: Validate Links

on:
  pull_request:
    paths:
      - 'entries/**'
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am UTC

permissions:
  contents: read
  issues: write

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install pyyaml requests

      - name: Check for dead links
        id: validate
        run: python validate.py

  open-issue:
    needs: validate
    if: failure() && github.event_name == 'schedule'
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Create issue for broken links
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Dead links detected',
              body: 'The weekly link validation found broken links. Run `python validate.py` locally to see details.',
              labels: ['bug']
            });
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/validate.yml
git commit -m "ci: add link validation workflow for PRs and weekly check"
```

---

### Task 9: Build Generated Output + Clean Up Deletions

**Files:**
- Modify: `docs/` (generated)

- [ ] **Step 1: Run the full build**

Run:
```bash
python build.py
```
Expected: `Built 1 entries with 1 tags into docs/`

- [ ] **Step 2: Open and visually verify the site**

Run:
```bash
open docs/index.html
```

Verify:
- Page loads with "Example Site" card
- Theme toggle switches between light and dark
- Search box filters (type "example" — card stays; type "nonexistent" — card hides)
- Tag pill "example" is clickable
- Clear button resets
- Entry count shows "Showing 1 of 1 entries"
- RSS link in footer works
- Responsive: resize browser to see column changes

- [ ] **Step 3: Add a second sample entry to test multi-entry behavior**

Create `entries/jinja-docs.yaml`:

```yaml
url: https://jinja.palletsprojects.com
title: Jinja2 Documentation
description: The official documentation for the Jinja2 template engine.
tags:
  - python
  - docs
date: 2026-04-03
```

- [ ] **Step 4: Rebuild and verify**

Run:
```bash
python build.py
open docs/index.html
```

Verify:
- Two cards visible, newest first (Example Site, then Jinja2)
- Three tags in tag bar: docs, example, python
- Search for "jinja" shows only the Jinja2 card
- Click "python" tag shows only Jinja2 card
- Entry count updates correctly

- [ ] **Step 5: Run all tests**

Run: `python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 6: Commit everything**

```bash
git add -A
git commit -m "feat: complete bookmark collection site with generated output"
```

This commit also stages the deletion of old Jekyll files (Gemfile, _config.yml, _data/, _pages/, _posts/, assets/, index.html, README.md) that were removed earlier.

---

### Task 10: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verify `.gitignore` doesn't block needed files**

The current `.gitignore` has `_site`, `.sass-cache`, `.jekyll-metadata`, `Gemfile.lock` — all Jekyll artifacts. These are harmless but outdated. The `.gitignore` should already have been updated in Task 1. Verify it only contains:

```
__pycache__/
*.pyc
.venv/
```

- [ ] **Step 2: Commit if changed**

```bash
git add .gitignore
git diff --staged --quiet || git commit -m "chore: update .gitignore for Python project"
```
