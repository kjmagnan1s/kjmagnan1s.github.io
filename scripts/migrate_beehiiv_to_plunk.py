"""One-time move of the kevinjmagnan.com list from Beehiiv ("Website list") to Plunk.

Copies every ACTIVE Beehiiv subscriber into the Plunk project "kevinjmagnan.com"
as a subscribed contact. No email is sent: contacts are created directly, so the
welcome email does not fire. Kevin's own test signups are skipped. Addresses
already in Plunk, in any state, are never touched, so a rerun can't re-subscribe
someone who opted out. If a lookup can't finish, the address is skipped too.

  python3 -I scripts/migrate_beehiiv_to_plunk.py            # dry run: counts only
  python3 -I scripts/migrate_beehiiv_to_plunk.py --apply    # write to Plunk

Keys: Keychain BEEHIIV_API_KEY and PLUNK_SECRET_KEY_WEBSITE.
"""
import json, subprocess, sys, urllib.parse, urllib.request, datetime

PUB = "pub_209b2043-0276-4a7e-aa74-1163c7b88ec7"
SKIP = {"kjmagnan1s@gmail.com", "kevinjmagnan@gmail.com", "aippliedlabs@gmail.com", "kevinjmagnan@slalom.com"}

def key(name):
    v = subprocess.run(["security", "find-generic-password", "-s", name, "-w"], capture_output=True, text=True).stdout.strip()
    if not v: sys.exit(f"Keychain item {name} is missing")
    return v

MAX_LOOKUP_PAGES = 5

def find_contact(email, k):
    """Same rule as findContact in src/worker/subscribe.ts: Plunk's search is a
    substring match, so page through the hits for the exact address. Returns
    "present", "absent", or "unknown" (more pages than the cap)."""
    cursor = ""
    for _ in range(MAX_LOOKUP_PAGES):
        q = urllib.parse.urlencode({"search": email, "limit": 100, **({"cursor": cursor} if cursor else {})})
        d = get(f"https://next-api.useplunk.com/contacts?{q}", k)
        if any((c.get("email") or "").lower() == email for c in d.get("data") or []): return "present"
        if not d.get("hasMore") or not d.get("cursor"): return "absent"
        cursor = d["cursor"]
    return "unknown"

def get(url, k):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + k}), timeout=30))

bk = key("BEEHIIV_API_KEY"); subs, page = [], 1
while True:
    d = get(f"https://api.beehiiv.com/v2/publications/{PUB}/subscriptions?status=active&limit=100&page={page}", bk)
    subs += d.get("data", [])
    if page >= d.get("total_pages", 1): break
    page += 1
keep = [s for s in subs if s.get("email", "").lower() not in SKIP]
print(f"Beehiiv active: {len(subs)}; to move: {len(keep)}; skipped as Kevin's own: {len(subs) - len(keep)}")
if "--apply" not in sys.argv: sys.exit(0)

pk = key("PLUNK_SECRET_KEY_WEBSITE"); moved = skipped = 0
for s in keep:
    found = find_contact(s["email"].lower(), pk)
    if found != "absent":
        print(f"skipped {s['email'].lower()}: {found} in Plunk"); skipped += 1; continue
    signed = datetime.datetime.fromtimestamp(s.get("created", 0), datetime.timezone.utc).isoformat()
    body = {"email": s["email"].lower(), "subscribed": True, "data": {
        "list": "kevinjmagnan.com", "imported_from": "beehiiv", "signed_up_at": signed,
        "utm_source": s.get("utm_source") or "", "utm_campaign": s.get("utm_campaign") or ""}}
    req = urllib.request.Request("https://next-api.useplunk.com/contacts", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + pk, "Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30); moved += 1
print(f"moved {moved} contacts to Plunk; left {skipped} existing contacts untouched")
