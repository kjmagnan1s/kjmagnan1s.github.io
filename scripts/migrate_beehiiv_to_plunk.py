"""One-time move of the kevinjmagnan.com list from Beehiiv ("Website list") to Plunk.

Copies every ACTIVE Beehiiv subscriber into the Plunk project "kevinjmagnan.com"
as a subscribed contact. No email is sent: contacts are created directly, so the
welcome email does not fire. Kevin's own test signups are skipped.

  python3 -I scripts/migrate_beehiiv_to_plunk.py            # dry run: counts only
  python3 -I scripts/migrate_beehiiv_to_plunk.py --apply    # write to Plunk

Keys: Keychain BEEHIIV_API_KEY and PLUNK_SECRET_KEY_WEBSITE.
"""
import json, subprocess, sys, urllib.request, datetime

PUB = "pub_209b2043-0276-4a7e-aa74-1163c7b88ec7"
SKIP = {"kjmagnan1s@gmail.com", "kevinjmagnan@gmail.com", "aippliedlabs@gmail.com", "kevinjmagnan@slalom.com"}

def key(name):
    v = subprocess.run(["security", "find-generic-password", "-s", name, "-w"], capture_output=True, text=True).stdout.strip()
    if not v: sys.exit(f"Keychain item {name} is missing")
    return v

def get(url, k):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + k}), timeout=30))

bk = key("BEEHIIV_API_KEY"); subs, page = [], 1
while True:
    d = get(f"https://api.beehiiv.com/v2/publications/{PUB}/subscriptions?status=active&limit=100&page={page}", bk)
    subs += d.get("data", [])
    if page >= d.get("total_pages", 1): break
    page += 1
keep = [s for s in subs if s.get("email", "").lower() not in SKIP and "magnan" not in s.get("email", "").lower()]
print(f"Beehiiv active: {len(subs)}; to move: {len(keep)}; skipped as Kevin's own: {len(subs) - len(keep)}")
if "--apply" not in sys.argv: sys.exit(0)

pk = key("PLUNK_SECRET_KEY_WEBSITE"); moved = 0
for s in keep:
    signed = datetime.datetime.fromtimestamp(s.get("created", 0), datetime.timezone.utc).isoformat()
    body = {"email": s["email"].lower(), "subscribed": True, "data": {
        "list": "kevinjmagnan.com", "imported_from": "beehiiv", "signed_up_at": signed,
        "utm_source": s.get("utm_source") or "", "utm_campaign": s.get("utm_campaign") or ""}}
    req = urllib.request.Request("https://next-api.useplunk.com/contacts", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + pk, "Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30); moved += 1
print(f"moved {moved} contacts to Plunk")
