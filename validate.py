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
