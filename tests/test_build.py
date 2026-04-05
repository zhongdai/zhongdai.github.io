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
