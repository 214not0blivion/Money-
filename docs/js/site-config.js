/* ==========================================================================
   Mendez Stone — single place to edit business details.
   Change the values below and every page updates automatically.
   Anything marked TODO is a placeholder that still needs your real info.
   ========================================================================== */

window.MENDEZ_STONE = {
  // --- Contact -------------------------------------------------------------
  // These match the Google Business Profile. Keep them identical in both
  // places — Google compares them, and a mismatch hurts local ranking.
  phone: '(972) 989-0169',
  phoneHref: 'tel:+19729890169',
  smsHref: 'sms:+19729890169',   // same number — opens the customer's text app
  email: 'info@mendezstone.com',              // TODO: real email
  // Where the booking form sends requests. Until a form backend is set up,
  // the form opens the customer's email app addressed here.
  bookingEmail: 'info@mendezstone.com',       // TODO: real email

  // --- Location & hours ----------------------------------------------------
  addressLine1: '8300 S Central Expy',
  addressLine2: 'Dallas, TX 75241',
  city: 'Dallas',
  state: 'TX',
  serviceArea: 'Dallas–Fort Worth and the surrounding North Texas communities',

  // Availability rather than fixed hours — we schedule around the customer.
  // If you ever want posted hours instead, replace these rows with real times
  // and make them identical to the Google Business Profile.
  hours: [
    ['Monday – Sunday', 'Flexible — call or text anytime'],
    ['Shop &amp; slab yard', 'Open by appointment'],
    ['Out on a job?', 'Text is fastest']
  ],

  // --- Google Business Profile ---------------------------------------------
  // Paste the two links from your Google Business Profile below. Any link left
  // empty simply hides itself on the site — nothing breaks.
  //
  // googleProfileUrl: your public listing. Search your business on Google,
  //   click "See all reviews" or the listing title, and copy the URL.
  // googleReviewUrl: the short "ask for reviews" link. In your Business
  //   Profile manager, choose "Ask for reviews" and copy the g.page/r/... link.
  //   Sending customers straight to this opens the star-rating box for them.
  googleProfileUrl: '',   // TODO: paste your Google listing URL
  googleReviewUrl: '',    // TODO: paste your "Ask for reviews" short link

  // --- Pricing used by the instant estimate --------------------------------
  // Installed price per square foot, low/high. Edit to match your real pricing.
  pricing: {
    granite:    { low: 45,  high: 75,  label: 'Granite' },
    quartz:     { low: 55,  high: 95,  label: 'Quartz' },
    marble:     { low: 70,  high: 140, label: 'Marble' },
    quartzite:  { low: 80,  high: 150, label: 'Quartzite' },
    porcelain:  { low: 65,  high: 120, label: 'Porcelain' },
    soapstone:  { low: 75,  high: 130, label: 'Soapstone' },
    unsure:     { low: 45,  high: 150, label: 'Not sure yet' }
  },
  // Flat add-ons, in dollars.
  addons: {
    sinkCutoutUndermount: 250,
    sinkCutoutDropin: 100,
    cooktopCutout: 125,
    faucetHole: 35,
    demoPerSqft: 8,
    edgeUpgradePerLnft: 12,
    backsplashPerLnft: 22
  },
  minimumJob: 750,          // smallest job we quote
  depositPercent: 50        // deposit collected at template
};
