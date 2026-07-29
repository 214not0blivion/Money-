# Mendez Stone — Website & Customer Portal

A static website for Mendez Stone: a marketing front page plus a customer portal
where people can research countertops and submit a complete installation request.

No build step, no framework, no dependencies. Plain HTML, CSS, and JavaScript —
open `index.html` in a browser and it works.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home page — services, process, material preview |
| `portal.html` | Customer portal hub — links to everything, plus contact details |
| `materials.html` | Material comparison table, edge profiles, thickness, seams |
| `booking.html` | The installation request form with a live ballpark estimate |
| `prepare.html` | Template-day and install-day checklists, how to self-measure |
| `faq.html` | FAQ on scheduling, pricing, warranty, plus care & maintenance |

## Before this goes live — edit these

Everything business-specific lives in **one file**: `js/site-config.js`.
Open it and replace every value marked `TODO`:

- `phone` / `phoneHref` — set, matches the Google Business Profile
- `addressLine1` / `addressLine2` — set to 8300 S Central Expy, Dallas, TX 75241
- `serviceArea` — set to Dallas–Fort Worth and North Texas
- `email` / `bookingEmail` — set to a working inbox, so booking requests
  arrive. Worth revisiting later: this address is published in plain text on
  every page, which attracts spam, and a personal Gmail reads as less
  established than a business address to some customers. A free Gmail alias or
  a `@mendezstone.com` address forwarding to the same inbox fixes both without
  changing where mail lands.
- `hours` — set to flexible availability ("call anytime", shop by appointment)
  rather than fixed times. The `index.html` structured data deliberately omits
  an `openingHoursSpecification` so the site never contradicts the hours on
  your Google Business Profile, which stays the single source of truth. If you
  later want posted hours on the site, put real times in `hours` and make them
  identical to the profile.
- `googleProfileUrl` / `googleReviewUrl` — **not yet filled in.** Until they
  are, the review links stay hidden.
- `pricing` — installed price per square foot, low and high, per material
- `addons` — flat prices for cutouts, demo, edge upgrades, backsplash
- `minimumJob` and `depositPercent`

Changing that one file updates the phone number, address, hours, and estimate
math across every page.

The price ranges also appear as text in the comparison table on
`materials.html` — update those to match if you change `pricing`.

Two more places repeat the address and hours and are **not** driven by the
config file, because search engines read them before JavaScript runs:

- the `application/ld+json` block in the `<head>` of `index.html`
- the service-area town list in the "Where we work" section of `index.html`

Update those by hand whenever the address or hours change.

## Local search

The site is set up for Dallas-area search: page titles and descriptions name
Dallas and DFW, the home page lists the towns served, and the structured-data
block tells Google this is a Dallas home-and-construction business with its
hours and service area.

The single highest-impact thing left is outside this repository — **claim your
Google Business Profile** at google.com/business. For a local trade, that
listing drives more calls than the website itself, and the two reinforce each
other. Use the exact same business name, address, and phone number in both
places; mismatches hurt local ranking.

## How the booking form submits

The form collects everything needed to schedule a job — contact, job site and
access notes, areas, material, edge, thickness, finish, sink and cooktop
cutouts, backsplash, demolition, plumbing, site readiness, and preferred dates.

Because this is a static site with no server, submitting composes a formatted
request and opens the customer's email app addressed to `bookingEmail`, with a
copy-paste fallback shown on the page.

**To receive submissions directly instead**, sign up for a form service
(Formspree, Netlify Forms, Basin, Getform — all have free tiers), then open
`js/booking.js` and set:

```js
var FORM_ENDPOINT = 'https://formspree.io/f/your-form-id';
```

The form will POST there and fall back to email only if the request fails.

## Photos

Job photos live in `img/`, two sizes each: `-800.jpg` for phones and
`-1600.jpg` for desktop and retina. The `<img>` tags use `srcset`, so a phone
downloads roughly 490 KB for the whole gallery instead of the 22 MB the
originals weighed.

**To add more**, don't upload straight off the camera — resize first:

```python
from PIL import Image, ImageOps
im = ImageOps.exif_transpose(Image.open('IMG_1234.jpeg')).convert('RGB')
for w in (1600, 800):
    out = im.copy(); out.thumbnail((w, w * 10), Image.LANCZOS)
    out.save(f'img/my-photo-{w}.jpg', 'JPEG', quality=82,
             optimize=True, progressive=True)
```

`exif_transpose` matters: phone photos carry a rotation flag, and skipping it
lands some pictures on their side.

Then copy a `<figure class="work-item">` block in the "Recent work" section of
`index.html`, and write a real caption. Say what the material is and what was
done — "quartzite island, single seam at the sink" beats "beautiful kitchen".

## Live shop status

A bar under the menu on every page tells customers whether you can pick up
right now — "Available right now", "On a job right now — back around 5:00 PM",
or "Out for now". It reads `status.json`.

**To change it:** open `status-editor.html`, pick a status and a rough end
time, tap *Copy status.json*, and paste the result into `status.json` in the
repository. That page is not linked from the public site and is marked
`noindex`. Bookmark the GitHub edit screen for `status.json` on your phone's
home screen and the whole thing is three taps.

The design assumes a wrong status is worse than no status, so it fails safe
three ways:

- **Auto-expiry.** A busy status carries an end time and flips itself back to
  available once that passes. Forgetting to clear it costs nothing — which is
  the point, because you will forget while carrying a slab.
- **Staleness.** If `status.json` has not been touched in four days, the bar
  stops claiming anything and shows a neutral "call or text anytime".
- **Silence on failure.** If the file is missing or unreachable, the bar hides
  itself rather than showing something misleading.

Open tabs re-check every five minutes; a fresh page load is immediate.

Be honest with yourself about whether you will keep this current. A status bar
that says "Available right now" while five calls go unanswered does more damage
than no bar at all. If you would rather not maintain it, delete `status.json`
and the bar disappears from every page on its own.

## The estimate calculator

`booking.html` shows a live price range as the customer fills in the form,
computed from square footage × the material's per-square-foot band, plus flat
add-ons for cutouts, demo, premium edges, and backsplash. It is labeled clearly
as a ballpark and not a quote, and it applies the job minimum from the config.

Tune the numbers in `js/site-config.js` so the ranges match what you actually
charge — a customer who sees a number far below your real price is a customer
who feels misled later.

## Publishing

Any static host works. The simplest options:

- **GitHub Pages** — in the repository settings, set Pages to deploy from the
  `docs/` folder on your default branch. The site is live at
  `https://<username>.github.io/<repo>/`.
- **Netlify or Vercel** — drag the `docs` folder onto their dashboard, or point
  them at this repository with `docs` as the publish directory.
- **Your own host** — upload the contents of `docs/` to the web root.

For a custom domain like `mendezstone.com`, buy the domain and point it at
whichever host you pick; all three support custom domains with free HTTPS.

## Things worth adding later

- Real photos of completed jobs — a gallery page does more selling than any
  amount of copy.
- A Google Business Profile and reviews embedded on the home page.
- A slab inventory page, if you carry your own stock.
