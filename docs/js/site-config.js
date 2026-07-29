/* ==========================================================================
   Mendez Stone — single place to edit business details.
   Change the values below and every page updates automatically.
   Anything marked TODO is a placeholder that still needs your real info.
   ========================================================================== */

window.MENDEZ_STONE = {
  // --- Contact -------------------------------------------------------------
  phone: '(000) 000-0000',                    // TODO: real phone
  phoneHref: 'tel:+10000000000',              // TODO: same number, digits only
  email: 'info@mendezstone.com',              // TODO: real email
  // Where the booking form sends requests. Until a form backend is set up,
  // the form opens the customer's email app addressed here.
  bookingEmail: 'info@mendezstone.com',       // TODO: real email

  // --- Location & hours ----------------------------------------------------
  addressLine1: 'S. Central Expressway',      // TODO: add street number + suite
  addressLine2: 'Dallas, TX',                 // TODO: add ZIP code
  city: 'Dallas',
  state: 'TX',
  serviceArea: 'Dallas–Fort Worth and the surrounding North Texas communities',
  hours: [
    ['Monday – Friday', '8:00 AM – 5:00 PM'],
    ['Saturday', '9:00 AM – 2:00 PM'],
    ['Sunday', 'Closed']
  ],

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
