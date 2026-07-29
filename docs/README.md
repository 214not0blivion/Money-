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

- `phone` / `phoneHref` — your real phone number
- `email` / `bookingEmail` — where booking requests should land
- `addressLine1` / `addressLine2` — shop and slab yard address
- `serviceArea` — the area you actually cover
- `hours` — your real business hours
- `pricing` — installed price per square foot, low and high, per material
- `addons` — flat prices for cutouts, demo, edge upgrades, backsplash
- `minimumJob` and `depositPercent`

Changing that one file updates the phone number, address, hours, and estimate
math across every page.

The price ranges also appear as text in the comparison table on
`materials.html` — update those to match if you change `pricing`.

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
