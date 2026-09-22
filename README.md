# RWT-iDecide

A branching decision funnel. It walks a visitor through a sequence of screens,
records which way they went at every fork, and hands the whole record to a CRM
when they submit a form.

The engine is generic. The funnel loaded here is the Radiant Wave Lounge,
Richmond — 30 slides across six zones, five-way sort, four branch tracks.

---

## Run it

Double-click `index.html`. That is all — it runs straight from a `file://` URL
with no server, because the funnel is a `.js` file the page loads with a script
tag rather than JSON it has to fetch.

Add `?debug=1` to the URL to see slide IDs, production build notes, and the
payload a submission would send.

**One thing needs a server:** posting to the GoHighLevel webhook. A `file://`
page sends `Origin: null`, which most webhook endpoints reject on the CORS
preflight. Everything else — the whole funnel, every branch, the tags, the
payload assembly — works fine from a file. So use `file://` for review and
demos, and put it on a real host before it takes live leads.

To run it over http anyway, double-click `serve.cmd` (needs Node) or use Live
Server in VS Code. The bundled server speaks byte ranges, so video seeks and
streams properly rather than downloading whole before it will play.

---

## Layout

```
index.html              the shell, nothing else
config.js               webhook URL, identity gate, debug flags
assets/css/idecide.css  the whole design system
assets/js/blocks.js     block renderers — the content vocabulary
assets/js/engine.js     state, routing, layouts, validation, handoff
data/funnel.js          the funnel itself: every slide, every fork
assets/media/           the footage
serve.cmd / serve.js    optional local server
tools/                  five checks you can run in a browser
```

`tools/smoke.html` walks a whole path — identity, sort, focus tags, offer
selection, form validation, handoff — and prints pass/fail plus the exact
payload. Works from `file://`.

`tools/overflow.html` loads every slide at phone and tablet width and reports
any that scroll sideways. This one **needs the server** — browsers block iframe
access on `file://`, and the tool says so rather than reporting a false pass.
Trust it over a phone-sized screenshot: headless browsers on Windows enforce a
minimum window width and then crop the image, which fakes a clipped layout.

`tools/film.html` checks the film sequence: the title card, the countdown
ticking three-two-one, the dissolve, the right file on the right slide, the
button held back and then landing dead centre on the frame, and the sign-in's
background film being muted, looping and dropped again elsewhere. It drives
the end of the film directly rather than sitting through it.

`tools/media.html` is the one that checks the footage itself, and it runs in
**real time** — open it in a browser rather than driving it headless. It loads
every file the funnel names and reports whether each one decodes and how
quickly a first frame appears. Under 100ms means `faststart` is set and the
browser can begin playing before the download finishes; several seconds means
the `moov` atom is at the end of the file and the whole thing has to arrive
first. Fix that losslessly with
`ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`.

`tools/interaction.html` checks the things that make it feel responsive and
the things that make the layout wide: that buttons really sit side by side,
that the two columns are beside each other, arrow-key movement, number-key
selection, that typing a digit into a form field does not navigate, the commit
animation, the back control, warm shadows, and that the drifting light is on
for dark screens and paints nothing on light ones.

None of them are part of the funnel; delete the folder before you deploy if
you'd rather not ship them.

To start a new client: copy the folder, replace `data/funnel.js`, and change
the `theme` block inside it. Nothing else needs to move.

---

## Connecting GoHighLevel

Open `config.js` and paste the inbound-webhook URL:

```js
handoff: {
  webhookUrl: 'https://services.leadconnectorhq.com/hooks/XXXX/webhook-trigger/YYYY'
}
```

Until that is set, every submission is printed to the browser console and shown
in a drawer at the bottom of the screen, so you can see exactly what will be
sent before you wire it up.

### What arrives

```json
{
  "funnel": "radiant-wave-lounge",
  "identity": { "firstName": "...", "lastName": "...", "email": "...", "mobile": "..." },
  "tags": ["OWNER", "FOCUS_MENTAL"],
  "offer": { "id": "pack-3", "name": "Three-hour pack", "price": 157 },
  "fields": { "system": "Elite II", "paymentPath": "Paid in full", "consent": true },
  "path": ["welcome", "S1", "S2", "S3", "S4", "S4b", "S9", "S14"],
  "choices": [{ "slide": "S3", "label": "...", "tag": "OWNER", "at": "..." }],
  "notes": [{ "kind": "opened", "detail": "$397 a month is a lot of money." }],
  "entry": { "referrer": "...", "utm": { "source": "..." } },
  "durationSeconds": 214
}
```

`path` and `choices` are the part a slide deck cannot give you. They tell the
booking desk how to open the call: which lane the person sorted into, which
focus categories they tapped, which objection panel they opened.

Map `tags` to GHL contact tags. Everything else is custom fields or a note.

### Timing

Nothing leaves the browser until a form is submitted.

The welcome screen is a hard gate: name and email required, no way past it.
Every visitor is therefore named from the first screen, and every tag and fork
after that attaches to a real person. The cost is whatever share of traffic
will not give an email before seeing anything — worth watching once it is live.

To open the gate, edit the welcome slide's form in `data/funnel.js`: drop the
two `"required": true` flags and add
`"skip": { "label": "Look around first", "to": "S1" }`. The engine then tracks
skippers anonymously and back-fills their whole path onto the record the moment
they submit anything later.

---

## Editing the funnel

`data/funnel.js` is the only file you need to touch for copy and routing. It is
a plain JSON object with `window.FUNNEL =` in front of it, so edit it exactly
as you would edit JSON. Being a `.js` file, it also tolerates `//` comments and
trailing commas, which strict JSON forbids.

### A slide

```json
"S4": {
  "name": "Owner",              // internal label, never shown to the visitor
  "zone": "Branch",             // organisational only
  "tone": "room",               // optional — a dark panel on the cream page
  "surface": "dark",            // optional — the whole page goes dark
  "layout": "cinema",           // optional — "editorial" (default), "cinema" (full-bleed film), "split" (sign-in)
  "wide": true,                 // optional — wider measure, for tables
  "parked": true,               // optional — written but not wired up yet
  "note": "production note, only visible with ?debug=1",
  "eyebrow": "line one\nline two",   // on a film slide this is the title card
  "countdown": 3,               // optional, film slides — 3, 2, 1 before the dissolve
  "background": { "video": "assets/media/x.mp4" },   // optional — film behind the page
  "heading": "...",
  "blocks": [ ... ],
  "choices": [ ... ]
}
```

### A choice

```json
{
  "label": "See the three residential systems",
  "note": "$26,999",                     // optional second line
  "to": "S11",                           // omit for a terminal choice
  "weight": "primary",                   // primary | secondary (default) | quiet
  "tag": "OWNER",                        // added to the record
  "set": { "system": "Elite II" },       // recorded as a field
  "handoff": false,                      // terminal only: do not send a payload
  "endHeading": "All set.",              // terminal only
  "endText": "..."
}
```

Weight is visible on the page. `primary` is a filled copper button,
`secondary` is a raised one, `quiet` is an exit on its own centred line with
no button at all. A sorting slide like S3 should use no primary — you are
sorting, not steering.

A label or note may name what the visitor already chose. `"Start {offer}"`
renders as "Start Vita Restore", and re-renders the moment they pick a
different tier. Available tokens: `{offer}`, `{offerPrice}`, `{system}`,
`{firstName}`. Each falls back to a neutral word when nothing is set yet.

### Block types

| Type | What it is |
|---|---|
| `prose` | Paragraphs. `"lede": true` for the opening line. |
| `spec` | One line of hardware facts under a heading. |
| `aside` | The bridge box — volunteered information that costs the seller something. |
| `video` | Starts itself, with no title, duration or production chrome on screen. `"full": true` fills the screen; `"hold": true` keeps the slide's choices hidden until it finishes; `advanceTo` skips straight on instead. |
| `plan` | The room drawn to its actual configuration. `"screens": 16`. |
| `plates` | Big images. One fills the column, two sit side by side, three put the lead on top. Named slots until the photography lands. |
| `tiles` | The focus menu. Square cards with checkboxes, deliberately unlike the pills. Every tick is tagged `FOCUS_<NAME>`. |
| `panels` | Accordion. Mechanism and objections — always behind a click. |
| `ladder` | Price options. Selecting one records the offer. Give recurring items `"period": "a month"` so the number never reads as one-off. |
| `price` | One headline price with its strike-through. |
| `summary` | What the visitor has picked, shown above a capture form so nobody submits wondering what they agreed to. |
| `counter` | Real scarcity. Edit by hand, weekly. Never reset it. |
| `compare` | A table. Put the slide on `"wide": true`. |
| `form` | `role: "identity"` names the visitor; `role: "capture"` sends the payload. `title`, `intro` and `footnote` turn it into a labelled sign-in panel. |

Full parameter lists are in the comment above each renderer in
`assets/js/blocks.js`.

### The validator

Every load checks the funnel and reports in the console: choices pointing at
slides that do not exist, dead ends, and unreachable slides. Slides marked
`"parked": true` are skipped.

---

## Things that need real values

| Where | What |
|---|---|
| `S6b` | `remaining: 11` — update weekly with the real count. Never reset it. |
| `S11`, `S11a-c` | "Ends 31 October 2026" — the introductory pricing deadline. |
| Video weight | The three films are ~9.5 Mbps, about 3× what 1080p web delivery needs. Re-encoding at CRF 23 would take 115MB down to roughly 25MB with little visible loss. |
| Photography | The stills are borrowed from RhemaWave. Replace them with Richmond photographs when you have them: same `{ "src", "note" }` shape. |
| `S8b` | Testimonials, parked until written releases are signed. |
| `config.js` | The GHL webhook URL. |

---

## Design

Cream and copper, with copper's own patina as the second accent. Source Serif 4
carries all the editorial voice including body prose; Karla handles only the
interface.

The ground is a field rather than a flat fill: warm high-left, sinking to the
far corner, with a grain overlay at 3.5% so it reads as a material. Every
shadow is tinted warm brown (`#3A200C` at low alpha) — there is no grey
anywhere in the build, because grey on cream reads as dirt.

The page is daylight and the room is dark, and the dark appears only where the
room itself does. It arrives two ways. `"surface": "dark"` takes the whole page
— shell and ground — and is used for the welcome screen and the three film
slides, so the opening runs as one continuous dark stretch before the page
comes up into daylight at the sort. `"tone": "room"` puts a single dark panel
on the cream page, and only S5 uses it now.

There is no chrome. No step counter, no progress bar, no breadcrumb: the
visitor is never shown where they are in the funnel or how much is left, so
each screen reads as the only thing in front of them. The single exception is
a ghost back control in the top-left, at 28% opacity until you go near it.

### Two columns, not one stack

Every slide but the film and the sign-in uses the same editorial frame: the
heading holds the left column and sticks there while you read; everything the
visitor reads or touches runs down the right. A single centred column leaves
two thirds of a desktop screen empty, which was the old layout's real problem.

It collapses to one column below 1000px.

### The buttons

They sit in a row, not a stack — a grid that fits two, three or four across
depending on how many there are and how long the labels run. Full sentences
get two across at most; short labels get more. Below 720px they stack, because
that is genuinely the only thing that fits.

An exit ("I'm just looking around", "Send me what you have") is not a button.
It gets its own line, centred, with no plate at all, so it never competes with
the real action.

Buttons are pills, and nothing else in the build is that shape. That matters
on the focus menu, where six selectable cards sit directly above three
navigation buttons: the square card with a checkbox is something you tick, the
rounded pill is somewhere you go. They were previously the same control drawn
twice, which is what made that screen confusing.

Each pill carries a soft top-to-bottom gradient and a hairline of light along
its top edge, so it reads as a raised surface rather than a flat swatch.
Primary is copper, secondary is paper. Hovering lifts it two pixels and puts a
soft copper ring around it. Pressing it brightens the pill, fades the others
to 22%, and only then moves the page — 170ms, short enough to read as
responsiveness, long enough to confirm the pick.

| Key | Does |
|---|---|
| `1`–`9` | Pick that button |
| `↑` `↓` | Move between buttons |
| `Enter` | Commit the focused button |
| `Backspace` | Back one step |

The shortcuts are announced to assistive tech via `aria-keyshortcuts` but
nothing is printed on the buttons — visible keycaps were clutter on a page
that is mostly buttons. ### Between slides

A change of screen is a dissolve, not a cut. The outgoing slide fades over
200ms before the next one is built, and the incoming one settles in over
340ms — mostly opacity, with 6px of movement to give the change a direction.
The surface flips at the *top* of the fade rather than after it, so going
from cream to dark crosses the ground and the content over together instead
of snapping once the words have gone.

A second click during a fade cancels the first rather than queueing behind
it, so nothing can strand the page half-faded. Under
 the swap is immediate.

Number keys are ignored while a form field has focus,
so typing a ZIP code never navigates. Everything is under 300ms and all of it
is suppressed under `prefers-reduced-motion`.

### Images

Photography of a room like this is the argument, so `plates` renders big: one
image fills the column at 16:9, two sit side by side at 4:3, three put the
lead across the top. Heights are capped against the viewport so the buttons
never fall off the bottom of the screen.

### The drifting light

The dark screens carry a slow-moving light layer behind everything — two
blurred colour fields at 38 and 53 seconds, drifting on different cycles so it
never visibly repeats. The colour is defined only under `body.is-dark`, so on
a light page the layer paints nothing at all rather than merely fading out.
It stops entirely under `prefers-reduced-motion`.

The welcome screen is a two-column sign-in — the pitch on the left, a framed
panel on the right — on the dark surface.

### The film

Each film slide runs as a sequence rather than a page:

1. **Black.** The slide's eyebrow appears in the middle of it at display
   size — a title card. Under it, a countdown ticks three, two, one at 900ms
   a beat. Clicking the card skips the whole preamble.
2. **The dissolve.** The card fades out over 900ms while the picture fades in
   over 1.5 seconds, so for a beat they overlap and the type seems to sink
   into the room.
3. **The film.** Near-fullscreen — 84vh, capped at 58rem — with a margin of
   dark all round, so it reads as something framed rather than a browser gone
   fullscreen. Nothing on screen names the video, its length, or its
   production state.
4. **The end card.** The picture dims behind a soft scrim and the single way
   onward settles into the middle of the frame.

The card is the slide's `eyebrow` field and the count is `"countdown": 3` on
the slide, so both are content rather than code. A film slide with no eyebrow
skips straight to step 3; one with no `countdown` holds the card for two and a
half seconds and then dissolves. The count is suppressed entirely under
`prefers-reduced-motion`.

### The footage

| File | Where it plays |
|---|---|
| `ID-rwt2.mp4` | Behind the sign-in, muted and looping |
| `ID-J1.mp4` | S1, the hook |
| `ID-J2.mp4` | S2, the room |
| `ID-J3.mp4` | S6, the insider film |
| `lounge.jpg` | S8 and S11c |
| `home-evening.jpg` | S5 and S11b |
| `home-living.jpg` | S11a |
| `rwt-lounge.png` | The Radiant Wave Lounge lockup, on the sign-in |

The stills came across from RhemaWave-v3. The lounge render was 2.2MB and is
recompressed to 170KB; the evening shot is a frame lifted from that project's
footage. Every one carries a caption saying what it actually shows, because
they are renders and stills of other rooms and a product page should not imply
a configuration it is not photographing.

A slide gets a background film with
`"background": { "video": "assets/media/….mp4" }`. It is always muted and
looped — that is the only autoplay a browser allows unasked — and it sits
under a scrim heavy enough that the type in front never fights it. The
drifting light layer stands down wherever there is real footage.

Copy note: the guide's calls to action were in capitals. They are sentence case
here — shouting contradicts the calm the whole thing is selling. Easy to change
back in the JSON if you disagree.

---

## When the real footage lands

Autoplay **with sound** is blocked by every browser until the visitor has
interacted with the page. Nothing in this code can change that; it is a rule
the browser enforces, and it exists because of autoplaying ads.

So the first film a cold visitor sees will start muted. The engine handles it
in three steps: try to play with sound, fall back to muted with a small
**Sound on** control in the corner of the frame, and if even muted autoplay is
refused, show a play button. Once they have clicked anything — the sign-in
button counts — every later film plays with sound normally.

Two things follow. First, these films are narration-driven, so the opening
seconds of V1 should still read without audio, or carry a caption. Second, the
sign-in screen now earns its keep twice over: clicking **Enter the Lounge** is
the interaction that unlocks sound for the rest of the funnel.

A **Skip** control sits in the corner while a film plays. Without it a visitor
is held for 22 to 30 seconds with no way out, which is worse on a second visit
than the pacing is worth. Say the word and I will take it out.
