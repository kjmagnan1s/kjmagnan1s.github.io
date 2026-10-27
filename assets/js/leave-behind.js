/* Leave-behind chrome for kevinjmagnan.com.
   One tag per page: <script src="/assets/js/leave-behind.js" defer></script>
   1. Puts the AIpplied Labs cross-link strip first in <body> (same copy as
      _includes/cross-strip.html, for pages that don't use the Jekyll layout).
   2. Shows a one-time email pop-up after 35% scroll or 20 seconds. It posts to
      /api/subscribe with the page slug as `source`, so Beehiiv records which
      page brought the signup. Skipped for anyone who already subscribed here
      (localStorage kjm_sub) or closed it in the last 30 days (kjm_popup_seen). */
(function () {
  "use strict";
  var SUB_KEY = "kjm_sub", SEEN_KEY = "kjm_popup_seen", DAYS = 30;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var css = document.createElement("style");
  css.textContent =
    '.xstrip{display:block;background:#e0662a;color:#0a1628;text-decoration:none;font-family:"Source Serif 4",Georgia,serif;font-size:.92rem;line-height:1.3;padding:9px clamp(16px,5vw,64px);text-align:center}.xstrip:hover{background:#e8793f}.xstrip b{font-weight:600}' +
    '.kjm-pop{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(7,26,49,.72)}.kjm-pop.open{display:flex}' +
    '.kjm-card{position:relative;width:min(440px,100%);background:#f3e6d3;color:#0a1628;border-radius:12px;padding:28px 28px 22px;box-shadow:0 24px 60px rgba(0,0,0,.4);font-family:"Source Serif 4",Georgia,serif}' +
    '.kjm-card .kjm-eyebrow{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#a8431a;margin:0 0 10px}' +
    '.kjm-card h2{font-family:"Fraunces",Georgia,serif;font-weight:700;font-size:1.7rem;line-height:1.05;letter-spacing:-.02em;margin:0 0 10px;color:#0a1628}' +
    '.kjm-card p{margin:0 0 16px;line-height:1.5;font-size:1rem;color:#0a1628}' +
    '.kjm-card form{display:flex;gap:8px;flex-wrap:wrap;margin:0}' +
    '.kjm-card input[type=email]{flex:1 1 180px;min-width:0;padding:11px 12px;border:1.5px solid #0a1628;border-radius:8px;font:inherit;font-size:1rem;background:#fff;color:#0a1628}' +
    '.kjm-card button[type=submit]{padding:11px 16px;border:0;border-radius:8px;background:#e0662a;color:#0a1628;font:inherit;font-weight:600;cursor:pointer}.kjm-card button[type=submit]:disabled{opacity:.6;cursor:default}' +
    '.kjm-card .kjm-status{min-height:1.3em;margin-top:10px;font-size:.9rem}.kjm-card .kjm-status.err{color:#a8431a}' +
    '.kjm-card .kjm-small{margin:12px 0 0;font-size:.82rem;color:#3b4a5e}.kjm-card .kjm-small a{color:inherit}' +
    '.kjm-x{position:absolute;top:10px;right:10px;width:36px;height:36px;border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:#3b4a5e;border-radius:8px}.kjm-x:hover{background:rgba(10,22,40,.08)}' +
    '.kjm-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '@media (prefers-reduced-motion:no-preference){.kjm-card{animation:kjm-in .25s ease-out}@keyframes kjm-in{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}}';
  document.head.appendChild(css);

  // 1. Strip
  if (!document.querySelector(".xstrip")) {
    var strip = document.createElement("a");
    strip.className = "xstrip";
    strip.href = "https://aippliedlabs.com/";
    strip.innerHTML = "Want this built for your business? <b>That's AIpplied Labs, my company.</b>";
    document.body.insertBefore(strip, document.body.firstChild);
  }

  // 2. Pop-up
  if (get(SUB_KEY)) return;
  var seen = Number(get(SEEN_KEY)) || 0;
  if (Date.now() - seen < DAYS * 864e5) return;

  var slug = location.pathname.replace(/\/index\.html$/, "").replace(/^\/+|\/+$/g, "").toLowerCase().replace(/[^a-z0-9/-]/g, "").slice(0, 40) || "home";

  var pop = document.createElement("div");
  pop.className = "kjm-pop";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-modal", "true");
  pop.setAttribute("aria-labelledby", "kjm-title");
  pop.innerHTML =
    '<div class="kjm-card">' +
      '<button class="kjm-x" type="button" aria-label="Close">×</button>' +
      '<p class="kjm-eyebrow">Kevin Magnan · @vibewithkevin</p>' +
      '<h2 id="kjm-title">Want the next one?</h2>' +
      '<p>New pages like this go to my email list first. Leave your email and you\'ll get the next one when it\'s out.</p>' +
      '<form novalidate>' +
        '<label class="kjm-hp">Company <input name="company" tabindex="-1" autocomplete="off"></label>' +
        '<input type="email" name="email" placeholder="you@email.com" required autocomplete="email" aria-label="Email">' +
        '<button type="submit">Send me the next one</button>' +
      '</form>' +
      '<div class="kjm-status" aria-live="polite"></div>' +
      '<p class="kjm-small">Unsubscribe anytime. <a href="#" class="kjm-no">No thanks</a></p>' +
    '</div>';
  document.body.appendChild(pop);

  var form = pop.querySelector("form"), status = pop.querySelector(".kjm-status");
  var fired = false, lastFocus = null;
  function say(msg, err) { status.textContent = msg; status.classList.toggle("err", !!err); }
  function open() {
    if (fired) return;
    fired = true;
    set(SEEN_KEY, String(Date.now()));
    lastFocus = document.activeElement;
    pop.classList.add("open");
    setTimeout(function () { form.email.focus(); }, 60);
  }
  function close() {
    pop.classList.remove("open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  pop.querySelector(".kjm-x").addEventListener("click", close);
  pop.querySelector(".kjm-no").addEventListener("click", function (e) { e.preventDefault(); close(); });
  pop.addEventListener("click", function (e) { if (e.target === pop) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pop.classList.contains("open")) close(); });

  function onScroll() {
    var h = document.documentElement;
    var max = (h.scrollHeight - h.clientHeight) || 1;
    if ((h.scrollTop || document.body.scrollTop) / max > 0.35) { open(); removeEventListener("scroll", onScroll); }
  }
  addEventListener("scroll", onScroll, { passive: true });
  setTimeout(open, 20000);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("That email doesn't look right. Check it and try again.", true); form.email.focus(); return; }
    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Sending...");
    try {
      var res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, company: form.company.value, source: slug }),
      });
      if (res.ok) {
        set(SUB_KEY, "1");
        form.remove();
        say("You're in. The next one lands in your inbox.");
        setTimeout(close, 2500);
        return;
      }
      say(res.status === 400 ? "That email doesn't look right. Check it and try again." : "Something went wrong on my end. Try again in a minute.", true);
    } catch (err) { say("Something went wrong on my end. Try again in a minute.", true); }
    btn.disabled = false;
  });
})();
