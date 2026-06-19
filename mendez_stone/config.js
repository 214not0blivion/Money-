/* ===========================================================================
   Mendez Stone — site configuration
   Edit these values. No build step, no framework — just save and refresh.
   =========================================================================== */
window.MENDEZ_CONFIG = {

  // 1) Your Booksy booking link. Paste the URL of your Booksy business page.
  //    On Booksy: Profile → Share → copy your booking link.
  //    Until you set this, "Book on Booksy" buttons scroll to the quote form.
  booksyUrl: "https://booksy.com/en-us/1567222_mendez-stone_other_134786_dallas",

  // 2) Where the quote form sends leads.
  //    - Leave "" to run in DEMO mode: the AI reply is generated locally in the
  //      browser (no server needed) so you can see exactly how it behaves.
  //    - Set to your lead_agent.py server (e.g. "http://localhost:8000/lead")
  //      to get real AI replies + leads saved + email/SMS automation.
  leadEndpoint: "",

  // 2b) Email each lead straight to your inbox with NO server — perfect for
  //     GitHub Pages / any static host. Get a FREE key in 30 seconds:
  //       1. go to https://web3forms.com
  //       2. type the email where you want leads sent
  //       3. copy the "Access Key" they show you and paste it below.
  //     When set, every quote submission emails you instantly (the visitor
  //     still sees the instant AI price reply either way).
  web3formsKey: "",

  // 2c) Simplest option — email leads with NO key and NO signup, via FormSubmit.
  //     Every quote request is emailed here. The FIRST submission sends a
  //     one-time confirmation email to this address; click the link once to
  //     activate, and all future leads arrive automatically.
  //     (Note: this email is visible in the page source. To hide it, use the
  //     web3formsKey option above instead, which uses an opaque key.)
  leadEmail: "angelmanuemartinez2@gmail.com",

  // 3) Pricing used by the instant estimate (per installed square foot, USD).
  //    Match these to your real numbers — they drive the instant quote.
  pricing: {
    Granite:  { low: 45, high: 75 },
    Quartz:   { low: 55, high: 90 },
    Marble:   { low: 70, high: 120 },
    "Not sure yet": { low: 45, high: 120 }
  },

  // 4) Minimum job price shown when sq ft is small/blank.
  minJob: 1200
};
