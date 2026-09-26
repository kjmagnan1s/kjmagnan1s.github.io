#!/usr/bin/env python3
"""Write a Markdown twin of the built homepage for agents.

Runs after `jekyll build`. Reads _site/index.html and writes _site/index.md.
The Worker serves that file when a request for / sends `Accept: text/markdown`
(see src/worker/markdown.ts). Needs pandoc on the PATH.
"""
import pathlib
import re
import subprocess
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent / "_site"
ORIGIN = "https://kevinjmagnan.com"


def to_markdown(html: str) -> str:
    # Media, icons, and code carry no text an agent can use.
    html = re.sub(
        r"<(video|svg|script|style|noscript|template)\b.*?</\1>",
        "",
        html,
        flags=re.S | re.I,
    )
    # Pandoc reads only <main> when a page has one, which drops the hero and
    # footer. Treat it as a plain container instead.
    html = re.sub(r"<(/?)main([\s>])", r"<\1div\2", html, flags=re.I)
    md = subprocess.run(
        ["pandoc", "-f", "html", "-t", "gfm-raw_html", "--wrap=none"],
        input=html,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    # Relative links and images resolve against the origin, since the Markdown
    # is read outside the page.
    md = re.sub(r"\]\((?!https?:|mailto:|#)/?", f"]({ORIGIN}/", md)
    md = re.sub(r"\]\(#", f"]({ORIGIN}/#", md)
    return md.strip() + "\n"


def main() -> int:
    src = SITE / "index.html"
    if not src.exists():
        print("generate_markdown: _site/index.html not found; run jekyll build first", file=sys.stderr)
        return 1
    (SITE / "index.md").write_text(to_markdown(src.read_text()))
    print("generate_markdown: wrote _site/index.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
