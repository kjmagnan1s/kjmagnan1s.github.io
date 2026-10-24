#!/usr/bin/env python3
"""Write an llms.txt and an RSS feed for the website resource library.

Runs after `jekyll build`. Reads _site/library/index.html and writes
_site/library/llms.txt and _site/library/feed.xml, so the page stays the only
place a resource is added. Each card's `data-added` date drives the feed order.
"""
import html
import pathlib
import re
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape

SITE = pathlib.Path(__file__).resolve().parent.parent / "_site"
PAGE_URL = "https://kevinjmagnan.com/library/"


def text(fragment: str) -> str:
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def parse(page: str) -> list[dict]:
    """Return sections, each with its title, note, and resources in page order."""
    sections = []
    parts = re.split(r'(<h2 id="[^"]+">.*?</h2>)', page, flags=re.S)
    for heading, body in zip(parts[1::2], parts[2::2]):
        section_id = re.search(r'id="([^"]+)"', heading).group(1)
        title = text(re.sub(r'<span class="num">.*?</span>', "", heading))
        note = re.search(r'<p class="section-note">(.*?)</p>', body, flags=re.S)
        items = []
        for li in re.findall(r"<li\b.*?</li>", body, flags=re.S):
            name = re.search(r'<a class="name" href="([^"]+)"[^>]*>(.*?)</a>', li, flags=re.S)
            if not name:
                continue
            added = re.search(r'data-added="(\d{4}-\d{2}-\d{2})"', li)
            if not added:
                raise ValueError(f"library card {text(name.group(2))!r} has no data-added date")
            code = re.search(r'<a class="code" href="([^"]+)"', li)
            desc = re.search(r"<p>(.*?)</p>", li, flags=re.S)
            items.append({
                "name": text(name.group(2)),
                "url": html.unescape(name.group(1)),
                "code": html.unescape(code.group(1)) if code else None,
                "description": text(desc.group(1)) if desc else "",
                "added": added.group(1),
                "section": title,
                "section_id": section_id,
            })
        sections.append({"id": section_id, "title": title, "note": text(note.group(1)) if note else "", "items": items})
    return sections


def llms_txt(sections: list[dict], intro: str) -> str:
    total = sum(len(s["items"]) for s in sections)
    lines = [
        "# Kevin's Website Resource Library",
        "",
        f"> {total} hand-picked resources for building websites with AI, grouped by what you need mid-build. Curated by Kevin Magnan.",
        "",
        intro,
        "",
        f"Human page: {PAGE_URL}. New additions: [RSS feed]({PAGE_URL}feed.xml).",
    ]
    for section in sections:
        lines += ["", f"## {section['title']}", ""]
        if section["note"]:
            lines += [section["note"], ""]
        for item in section["items"]:
            line = f"- [{item['name']}]({item['url']}): {item['description']}"
            if item["code"]:
                line += f" Source: {item['code']}"
            lines.append(line)
    return "\n".join(lines) + "\n"


def rss(sections: list[dict], limit: int = 50) -> str:
    # Newest first; on the same day, later on the page counts as newer.
    items = [i for s in sections for i in s["items"]]
    ordered = sorted(enumerate(items), key=lambda p: (p[1]["added"], p[0]), reverse=True)[:limit]

    def date(day: str) -> str:
        return format_datetime(datetime.strptime(day, "%Y-%m-%d").replace(hour=12, tzinfo=timezone.utc))

    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "<channel>",
        "<title>Kevin's Website Resource Library</title>",
        f"<link>{PAGE_URL}</link>",
        f'<atom:link href="{PAGE_URL}feed.xml" rel="self" type="application/rss+xml"/>',
        "<description>New website-building resources as Kevin Magnan adds them to the library.</description>",
        "<language>en-us</language>",
        f"<lastBuildDate>{date(ordered[0][1]['added'])}</lastBuildDate>" if ordered else "",
    ]
    for _, item in ordered:
        out += [
            "<item>",
            f"<title>{escape(item['name'])}</title>",
            f"<link>{escape(item['url'])}</link>",
            f'<guid isPermaLink="false">{escape(item["url"])}</guid>',
            f"<category>{escape(item['section'])}</category>",
            f"<pubDate>{date(item['added'])}</pubDate>",
            f"<description>{escape(item['description'])} (In {escape(item['section'])}: {PAGE_URL}#{item['section_id']})</description>",
            "</item>",
        ]
    out += ["</channel>", "</rss>"]
    return "\n".join(line for line in out if line) + "\n"


def main() -> int:
    src = SITE / "library" / "index.html"
    if not src.exists():
        print("generate_library_feeds: _site/library/index.html not found; run jekyll build first", file=sys.stderr)
        return 1
    page = src.read_text()
    intro = re.search(r'<div class="intro">\s*<p>(.*?)</p>', page, flags=re.S)
    sections = parse(page)
    (src.parent / "llms.txt").write_text(llms_txt(sections, text(intro.group(1)) if intro else ""))
    (src.parent / "feed.xml").write_text(rss(sections))
    total = sum(len(s["items"]) for s in sections)
    print(f"generate_library_feeds: wrote _site/library/llms.txt and feed.xml ({total} resources)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
