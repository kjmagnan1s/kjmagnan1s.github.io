"""Generate sitemap.xml using file metadata and post front matter.

Run with `python3 scripts/generate_sitemap.py` from the project root.
The script respects future-dated posts (matching Jekyll's default behaviour).
"""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from typing import Iterable, List, Optional

BASE_URL = "https://kevinjmagnan.com"
ROOT = Path(__file__).resolve().parent.parent
SITEMAP_PATH = ROOT / "sitemap.xml"


def iso_from_path(path: Path) -> str:
    """Return a YYYY-MM-DD string using the file's mtime."""
    ts = dt.datetime.utcfromtimestamp(path.stat().st_mtime)
    return ts.strftime("%Y-%m-%d")


def parse_frontmatter_date(path: Path) -> Optional[dt.date]:
    """Extract the `date:` entry from a Markdown file's front matter."""
    with path.open("r", encoding="utf-8") as handle:
        lines = handle.readlines()

    if not lines or lines[0].strip() != "---":
        return None

    for line in lines[1:]:
        stripped = line.strip()
        if stripped == "---":
            break
        if stripped.lower().startswith("date:"):
            value = line.split(":", 1)[1].strip().strip('"')
            try:
                return dt.date.fromisoformat(value)
            except ValueError:
                return None
    return None


def collect_urls() -> List[dict]:
    today = dt.date.today()
    urls: List[dict] = []

    def add_url(loc: str, path: Optional[Path], changefreq: str, priority: str, lastmod: Optional[str] = None) -> None:
        actual_lastmod = lastmod
        if actual_lastmod is None and path is not None and path.exists():
            actual_lastmod = iso_from_path(path)
        urls.append(
            {
                "loc": f"{BASE_URL}{loc}",
                "lastmod": actual_lastmod,
                "changefreq": changefreq,
                "priority": priority,
            }
        )

    add_url("/", ROOT / "index.html", "weekly", "1.0")
    add_url("/about/", ROOT / "about.md", "monthly", "0.8")
    add_url("/blog/", ROOT / "blog.html", "weekly", "0.7")
    add_url("/resume/", ROOT / "resume.md", "monthly", "0.7")
    add_url("/contact/", ROOT / "contact.html", "monthly", "0.6")
    add_url("/robot/", ROOT / "robot.md", "monthly", "0.5")
    add_url("/api/profile.json", ROOT / "api" / "profile.json", "monthly", "0.4")

    posts_dir = ROOT / "_posts"
    for post_path in sorted(posts_dir.glob("*.md")):
        date_value = parse_frontmatter_date(post_path)
        if date_value is None:
            # fall back to the filename prefix
            try:
                date_value = dt.date.fromisoformat(post_path.name[:10])
            except ValueError:
                continue
        if date_value > today:
            continue

        slug = post_path.name[11:-3]
        loc = f"/{date_value:%Y/%m/%d}/{slug}.html"
        add_url(loc, post_path, "monthly", "0.5", lastmod=date_value.isoformat())

    return urls


def build_xml(urls: Iterable[dict]) -> str:
    lines = [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    ]
    for entry in urls:
        lines.append("    <url>")
        lines.append(f"        <loc>{entry['loc']}</loc>")
        if entry.get("lastmod"):
            lines.append(f"        <lastmod>{entry['lastmod']}</lastmod>")
        if entry.get("changefreq"):
            lines.append(f"        <changefreq>{entry['changefreq']}</changefreq>")
        if entry.get("priority"):
            lines.append(f"        <priority>{entry['priority']}</priority>")
        lines.append("    </url>")
    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate sitemap.xml")
    parser.add_argument(
        "--output",
        type=Path,
        default=SITEMAP_PATH,
        help="Path to write the sitemap (default: sitemap.xml in project root)",
    )
    args = parser.parse_args()

    urls = collect_urls()
    xml = build_xml(urls)
    args.output.write_text(xml, encoding="utf-8")
    print(f"Wrote {args.output} with {len(urls)} URLs.")


if __name__ == "__main__":
    main()
