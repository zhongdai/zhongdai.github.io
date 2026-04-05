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


def collect_tags(entries, limit=10):
    """Collect top tags by frequency."""
    counts = {}
    for entry in entries:
        for tag in entry["tags"]:
            counts[tag] = counts.get(tag, 0) + 1
    ranked = sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    return [tag for tag, _ in ranked[:limit]]


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
