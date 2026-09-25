import { useState, type MouseEvent, type ReactNode } from "react";
import { defineRegistry } from "@json-render/react";
// One source of truth: the same catalog the Worker composes against.
import { catalog } from "../worker/compose/catalog";

const SITE_ORIGIN = "https://kevinjmagnan.com";

/**
 * Cards carry absolute kevinjmagnan.com URLs so the spec is portable. On any
 * host that serves this site (workers.dev, a preview, the real domain) the
 * static twin lives at the same path, so keep those links on the current
 * origin and let everything else leave.
 */
export function localHref(url: string): string {
  if (url.startsWith(SITE_ORIGIN)) return url.slice(SITE_ORIGIN.length) || "/";
  return url;
}

function isOffsite(href: string): boolean {
  return /^https?:/i.test(href);
}

function linkProps(url: string) {
  const href = localHref(url);
  return isOffsite(href)
    ? { href, target: "_blank" as const, rel: "noopener" }
    : { href };
}

/** The whole card is pressable, but a click on the real link stays the link's. */
function cardPress(emit: (event: string) => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("a, button, textarea, input")) return;
    emit("press");
  };
}

function CardTitle({ url, children }: { url: string | null; children: ReactNode }) {
  return (
    <h3 className="composed-card-title">
      {url ? <a {...linkProps(url)}>{children}</a> : children}
    </h3>
  );
}

function MoreLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  return (
    <a className="composed-more" {...linkProps(url)}>
      {label}
    </a>
  );
}

/** The recruiter box. Same /api/chat contract the site's chat modal uses. */
function FitBox({ heading, placeholder }: { heading: string; placeholder: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: string;
    strongFit: string[];
    growthAreas: string[];
    gaps: string[];
  } | null>(null);

  async function analyze() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), mode: "fit-analysis" }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || data.parseError || typeof data.summary !== "string") {
        setError("The fit check is unavailable right now. Email me instead.");
        return;
      }
      setResult({
        summary: data.summary as string,
        strongFit: (data.strongFit as string[]) ?? [],
        growthAreas: (data.growthAreas as string[]) ?? [],
        gaps: (data.gaps as string[]) ?? [],
      });
    } catch {
      setError("The fit check is unavailable right now. Email me instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="composed-card composed-fit">
      <h3 className="composed-card-title">{heading}</h3>
      {result ? (
        <div className="composed-fit-result">
          <p>{result.summary}</p>
          {(
            [
              ["Strong", result.strongFit],
              ["Growth areas", result.growthAreas],
              ["Gaps", result.gaps],
            ] as const
          ).map(([label, items]) =>
            items.length ? (
              <div key={label}>
                <p className="composed-eyebrow">{label}</p>
                <ul className="composed-list">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          <button type="button" className="composed-button" onClick={() => setResult(null)}>
            Try another
          </button>
        </div>
      ) : (
        <>
          <textarea
            className="composed-textarea"
            rows={4}
            placeholder={placeholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="button"
            className="composed-button"
            disabled={busy || !text.trim()}
            onClick={() => void analyze()}
          >
            {busy ? "Reading it..." : "Check the fit"}
          </button>
          {error && <p className="composed-muted">{error}</p>}
        </>
      )}
    </div>
  );
}

/** Open a URL. Same-site links stay in this tab so Back works; the rest leave. */
async function navigate(params: Record<string, unknown> | undefined) {
  const url = params?.url;
  if (typeof url !== "string") return;
  const href = localHref(url);
  if (isOffsite(href)) window.open(href, "_blank", "noopener");
  else window.location.href = href;
}

export const { registry } = defineRegistry(catalog, {
  components: {
    Page: ({ children }) => <div className="composed-page">{children}</div>,

    Section: ({ props, children }) => (
      <section className="composed-section">
        {props.eyebrow && <p className="section-label">{props.eyebrow}</p>}
        <h2 className="composed-section-title">{props.title}</h2>
        <div className="composed-section-body">{children}</div>
      </section>
    ),

    Row: ({ props, children }) => (
      <div className={`composed-row composed-row-${props.columns}`}>{children}</div>
    ),

    Hero: ({ props }) => (
      <header className="composed-intro">
        <h2 className="composed-intro-name">{props.name}</h2>
        <p className="composed-intro-tagline">{props.tagline}</p>
        {props.subline && <p className="composed-muted">{props.subline}</p>}
      </header>
    ),

    Text: ({ props }) => <p className={`composed-text is-${props.variant}`}>{props.text}</p>,

    StatStrip: ({ props }) => (
      <div className="composed-card composed-stats">
        <div className="composed-stat-grid">
          {props.stats.map((stat) => (
            <div key={stat.label} className="composed-stat">
              <span className="composed-stat-value">{stat.value}</span>
              <span className="composed-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        {props.caption && <p className="composed-muted">{props.caption}</p>}
      </div>
    ),

    SkillTags: ({ props }) => (
      <div className="composed-block">
        <ul className="composed-tags">
          {props.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
        <MoreLink url={props.url} label="Full resume" />
      </div>
    ),

    RoleCard: ({ props, emit }) => (
      <article className="composed-card is-pressable" onClick={cardPress(emit)}>
        <CardTitle url={props.url}>{props.title}</CardTitle>
        <p className="composed-card-meta">
          {props.company}
          {props.location ? `, ${props.location}` : ""} · {props.period}
        </p>
        {props.achievements.length > 0 && (
          <ul className="composed-list">
            {props.achievements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </article>
    ),

    ProjectCard: ({ props, emit }) => (
      <article className="composed-card is-pressable" onClick={cardPress(emit)}>
        <CardTitle url={props.url}>{props.name}</CardTitle>
        {props.kind && <span className="project-badge">{props.kind}</span>}
        <p className="composed-card-desc">{props.summary}</p>
        {props.tags.length > 0 && (
          <ul className="composed-tags is-small">
            {props.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </article>
    ),

    PostCard: ({ props, emit }) => (
      <article className="composed-card is-pressable" onClick={cardPress(emit)}>
        <CardTitle url={props.url}>{props.title}</CardTitle>
        <p className="composed-card-meta">{props.date}</p>
        <p className="composed-card-desc">{props.summary}</p>
      </article>
    ),

    EducationList: ({ props }) => (
      <div className="composed-block">
        <ul className="composed-list is-plain">
          {props.items.map((item) => (
            <li key={`${item.institution}-${item.degree}`}>
              <strong>{item.degree}</strong>
              <span className="composed-muted">
                {" "}
                {item.institution}
                {item.honors ? `, ${item.honors}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <MoreLink url={props.url} label="Full resume" />
      </div>
    ),

    LinkRow: ({ props }) => (
      <nav className="social-links composed-links" aria-label="Elsewhere">
        {props.links.map((link) => (
          <a key={link.href} {...linkProps(link.href)}>
            {link.label}
          </a>
        ))}
      </nav>
    ),

    ContactCTA: ({ props, emit }) => (
      <div className="composed-card composed-cta">
        <CardTitle url={props.url}>{props.heading}</CardTitle>
        <p className="composed-card-desc">{props.text}</p>
        <button type="button" className="composed-button" onClick={() => emit("press")}>
          {props.buttonLabel}
        </button>
      </div>
    ),

    FitAnalysis: ({ props }) => (
      <FitBox heading={props.heading} placeholder={props.placeholder} />
    ),

    GameTeaser: ({ props, emit }) => (
      <div className="composed-card composed-game is-pressable" onClick={cardPress(emit)}>
        <CardTitle url={props.url}>{props.title}</CardTitle>
        <p className="composed-card-desc">{props.text}</p>
      </div>
    ),
  },

  actions: { navigate },
});

/**
 * Action handlers for JSONUIProvider. defineRegistry also builds these, but
 * only fires them when a state setter is supplied; navigate needs no state,
 * so the plain map is what the provider gets.
 */
export const actionHandlers = { navigate };
