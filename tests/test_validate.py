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
