/* ------------------------------------------------------------------
   RWT-iDecide — installation config
   This is the only file you edit to point the engine at a CRM.
   Funnel content lives in data/funnel.js.
------------------------------------------------------------------- */
window.IDECIDE_CONFIG = {

  /* The funnel content lives in data/funnel.js, which index.html loads
     with a <script> tag. That is what lets the page run straight from a
     file:// URL with no server.

     Leave this null unless you would rather keep the funnel as a .json
     file fetched over http, in which case put its path here and remove
     the data/funnel.js <script> tag from index.html. */
  funnel: null,

  /* Where a completed lead goes. ------------------------------------
     Paste the GoHighLevel inbound-webhook URL into webhookUrl and the
     engine starts posting. Until then every submission is held in the
     browser and printed to the console so you can inspect the payload. */
  handoff: {
    webhookUrl: '',            // e.g. 'https://services.leadconnectorhq.com/hooks/XXXX/webhook-trigger/YYYY'
    method: 'POST',
    timeoutMs: 8000,
    /* Retry once on network failure, then keep the payload in
       sessionStorage under idecide:pending so nothing is lost. */
    retry: true
  },

  /* The welcome screen is currently a hard gate: no name and email,
     no entry. That lives in the funnel file, not here — the welcome
     slide's form fields carry "required": true, and it has no skip.

     To let people in without identifying themselves, open
     data/funnel.js, drop those two "required" flags, and add
       "skip": { "label": "Look around first", "to": "S1" }
     to the same form block. */

  /* Add ?debug=1 to the URL to switch these on for one session. */
  debug: {
    showBuildNotes: false,     // production notes from the JSON
    showSlideIds: false,       // S3, S11c … beside each heading
    validateOnLoad: true       // dead ends + unreachable slides -> console
  }
};
