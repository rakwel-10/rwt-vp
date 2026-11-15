/* ==================================================================
   Radiant Wave Lounge - the funnel itself.

   This is a plain JSON object with one line of JavaScript in front of
   it, so the page can read it straight from a file:// URL with no
   server and no build step. Edit it exactly as you would edit JSON.

   Because it is a .js file you may also use // comments and trailing
   commas, which strict JSON forbids.
   ================================================================== */

window.FUNNEL = {
  "meta": {
    "id": "radiant-wave-lounge",
    "name": "Radiant Wave Lounge",
    "start": "welcome"
  },

  "theme": {
    "paper": "#EFE9DC",
    "paper-deep": "#E4DCCB",
    "paper-edge": "#D6CCB8",
    "ink": "#241C16",
    "ink-soft": "#6E5F52",
    "copper": "#9A5527",
    "copper-deep": "#874818",
    "copper-lift": "#B2683A",
    "patina": "#4E6F66",
    "room": "#16110E"
  },

  /* Background music. Plays from the first track, advances when one
     ends and wraps at the end, so there is sound throughout. Volume
     is a fraction, deliberately low - this sits under the room, it
     is not the room. */
  "music": {
    "volume": 0.4,
    "tracks": [
      "assets/media/bgm/Number Frequency Energy Meditation Music.mp3",
      "assets/media/bgm/1.mp3",
      "assets/media/bgm/2.mp3",
      "assets/media/bgm/3.mp3",
      "assets/media/bgm/4.mp4",
      "assets/media/bgm/5.mp4",
      "assets/media/bgm/6.mp4"
    ]
  },

  "slides": {

    "welcome": {
      "name": "Welcome",
      "zone": "Entry",
      "kind": "entry",
      "surface": "light",
      "layout": "hero",
      "background": { "image": "assets/media/login-rwt.jpg" },
      "note": "Hard gate: no skip. The form is a GHL-hosted embed (RW Lounge Capture Form) rather than the funnel's own fields, so the lead is saved in GoHighLevel the moment they submit - before the visitor ever sees S1. Trade-off: because the form lives in GHL's iframe, this.record never learns their name/email, so {firstName} personalisation later in the funnel falls back to \"there\" and GHL checkout/calendar prefill has nothing to prefill with.",
      "blocks": [
        { "type": "logo", "src": "assets/media/rwt-lounge.png", "alt": "Radiant Wave Lounge — Members Only", "wide": true },
        {
          "type": "prose",
          "lede": true,
          "text": "Eleven seats. Admission is by membership or invitation, and the room stays that small on purpose."
        },
        {
          "type": "ghlForm",
          "then": "S1",
          "title": "Register to proceed",
          "intro": "Leave your name and we will open the door. It also keeps your place if you come back.",
          "footnote": "We use this to hold your place and nothing else. No list, no forwarding, no third parties.",
          "src": "https://app.vitapureinfusions.com/widget/form/fuWFOlmAiyHxwGXZPYPi",
          "scriptSrc": "https://app.vitapureinfusions.com/js/form_embed.js",
          "formId": "fuWFOlmAiyHxwGXZPYPi",
          "formName": "RW Lounge Capture Form",
          "height": 432
        }
      ]
    },

    "S1": {
      "name": "Hook",
      "zone": "Spine",
      "surface": "dark",
      "layout": "cinema",
      "note": "Room stays empty the whole film. An empty room is an invitation; an occupied one is somebody else's hour. No title card: the film starts the moment the visitor arrives from the sign-in.",
      "blocks": [
        {
          "type": "video",
          "id": "V1",
          "src": "assets/media/V1.mp4",
          "hold": true,
          "full": true,
          "seconds": 39,
          "words": 52,
          "script": "There's one thing money keeps failing to buy you.\n\nAn hour that nobody can interrupt.\n\nNot a spa hour. Not a vacation hour, where you're still checking email from a beach chair.\n\nA real one. Dark. Quiet. No phone. No one who needs anything from you.\n\nRichmond, we built you a room."
        }
      ],
      "choices": [
        { "label": "Show me the room", "to": "S2", "weight": "primary" }
      ]
    },

    "S2": {
      "name": "The Room",
      "zone": "Spine",
      "surface": "dark",
      "layout": "cinema",
      "countdown": 3,
      "note": "The 0:14 cut to rhema_3 is the most important edit in the deck. Hold it six full seconds — everything before it is cold, that cut makes it human.",
      "eyebrow": "The Radiant Wave Lounge\nRichmond, Virginia",
      "blocks": [
        {
          "type": "video",
          "id": "V2",
          "src": "assets/media/V2.mp4",
          "hold": true,
          "full": true,
          "seconds": 48,
          "words": 86,
          "script": "Sixteen screens. Not on a wall — in towers, facing each other, with you in the middle.\n\nColour, sound, motion and powerful proclamations, moving together across every screen at once. Not layered. Not taking turns. Together. That combination didn't exist two years ago.\n\nYou sink into a recliner. The light drops. And for the next sixty minutes you're in Radiant Waves — and genuinely unreachable.\n\nMost people fall asleep the first time. Almost everybody books a second one before they leave.\n\nRichmond's first Radiant Wave Lounge. Members only."
        }
      ],
      "choices": [
        { "label": "Continue", "to": "S3", "weight": "primary" }
      ]
    },

    "S3": {
      "name": "The Sort",
      "zone": "Spine",
      "note": "Every lead passes through here. All five choices carry equal weight — no primary. You are sorting, not steering.",
      "heading": "Before we go further,\nwhich one is _actually you?_",
      "blocks": [
        {
          "type": "prose",
          "lede": true,
          "text": "There's **no wrong answer**. But there is a _right one for you,_ and the rest of this changes based on what you pick."
        }
      ],
      "choices": [
        { "label": "I want one of these in _my own house._", "to": "S4", "tag": "OWNER" },
        { "label": "Honestly? I just need to lie down somewhere _quiet. Soon._", "to": "S5", "tag": "URGENT" },
        { "label": "I want in _before everybody else_ finds out about it.", "to": "S6", "tag": "INSIDER" },
        { "label": "I'm curious. Show me _what it actually does._", "to": "S7a", "tag": "CURIOUS" },
        { "label": "I'm _just looking around._", "to": "S3b", "tag": "COLD" }
      ]
    },

    "S3b": {
      "name": "Soft Takeaway",
      "zone": "Branch",
      "note": "Expect 50-60% to take the two minutes and rejoin as Curious. Naming the objection and then declining to sell is what makes it work.",
      "heading": "Fair enough.",
      "blocks": [
        {
          "type": "prose",
          "text": "The Lounge holds a limited number of members and we're not in a hurry to fill it.\n\nBut in our experience, \"just looking\" usually means \"don't sell me anything.\" So we won't. Two more minutes, no pitch, and you can decide for yourself."
        }
      ],
      "choices": [
        { "label": "Give me two minutes", "to": "S7a", "weight": "primary" },
        { "label": "No thanks", "to": "S3c", "weight": "quiet" }
      ]
    },

    "S3c": {
      "name": "Soft Exit",
      "zone": "Capture",
      "note": "Terminal. Never call a COLD tag — they told you not to, and in a market Richmond's size that person talks.",
      "heading": "No problem at all.",
      "blocks": [
        {
          "type": "prose",
          "text": "If you'd like to hear when we open founding memberships, we'll write once. Or nothing at all, ever. That's entirely your call."
        },
        {
          "type": "form",
          "role": "capture",
          "submit": "Keep me posted",
          "fields": [
            { "name": "email", "label": "Email", "type": "email", "full": true }
          ],
          "done": {
            "heading": "Noted.",
            "text": "One email when founding memberships open. Nothing before then."
          }
        }
      ],
      "choices": [
        {
          "label": "I'm all set",
          "weight": "quiet",
          "handoff": false,
          "endHeading": "All set.",
          "endText": "Nothing will come from us. Thanks for the look around."
        }
      ]
    },

    "S4": {
      "name": "Owner",
      "zone": "Branch",
      "note": "The trial choice is the money button — nobody buys $40,000 off a presentation. What you're competing for is a visit, which is why it sits second and carries the only primary weight.",
      "heading": "You're not looking for an appointment.",
      "blocks": [
        {
          "type": "prose",
          "text": "You're looking for the thing itself. In your house. On your schedule. No booking, no driving, no sharing it with anyone.\n\nWe understand completely. It's why we built the Lounge in the first place.\n\nWe're an authorized distributor for all three residential configurations, and we schedule delivery in the order systems are reserved."
        }
      ],
      "choices": [
        { "label": "See the three residential systems", "to": "S11" },
        { "label": "Can I try one before I buy one?", "to": "S4b", "weight": "primary" },
        { "label": "Reserve my place in the delivery order", "to": "S13" },
        { "label": "What does the Lounge feel like first?", "to": "S7a", "weight": "quiet" }
      ]
    },

    "S4b": {
      "name": "Credited Trial",
      "zone": "Depth",
      "note": "Telling a five-figure prospect not to buy yet is the most credible thing you can say to them. Never soften that first line.",
      "heading": "Yes. And frankly, you should.",
      "blocks": [
        {
          "type": "prose",
          "text": "Nobody should spend residential-system money on an experience they've never had. Come use ours.\n\nThree hours in the Lounge is $157. If you reserve a residential system within 90 days, we credit the full $157 toward it.\n\nThat's a trial with a deposit attached, which is the only kind that filters for people who are actually serious.\n\nYou'll also see the sixteen-screen configuration running — about 6,800 square inches of screen surface, double our largest home system."
        }
      ],
      "choices": [
        { "label": "Book the three hours, $157", "to": "S9", "weight": "primary" },
        { "label": "See the systems first", "to": "S11" }
      ]
    },

    "S5": {
      "name": "Trapped",
      "zone": "Branch",
      "note": "A light slide like the rest (it was the dark room panel until November 2026). Two images, two choices, nothing else. Short dwell time here is success — she read it, recognised herself, clicked. Over 40 seconds means she's deliberating.",
      "heading": "You don't need a program. You need Tuesday at 4pm.",
      "blocks": [
        {
          "type": "prose",
          "text": "You're not looking for a wellness journey. You're looking for one hour where nothing is on fire and nobody needs you.\n\nWe have that hour. It's in Richmond. You can have it this week.\n\nThat's the whole offer. There isn't a catch."
        },
        {
          "type": "plates",
          "items": [
            { "src": "assets/media/home-evening.jpg", "note": "An hour at home with a single system running." }
          ]
        }
      ],
      "choices": [
        { "label": "Get me in this week, show me times", "to": "S5b", "weight": "primary" },
        { "label": "What is this room, actually?", "to": "S7a" }
      ]
    },

    "S5b": {
      "name": "The Times",
      "zone": "Depth",
      "note": "Routes straight to the close, skipping the pricing ladder. She asked for times, not a price ladder. Show availability windows, never a live calendar — visible gaps read as an empty business.",
      "heading": "This week.",
      "blocks": [
        {
          "type": "prose",
          "text": "Weekday afternoons are the quietest. Most people find 2 to 5 the easiest hour to protect.\n\nWeekends fill first."
        },
        {
          "type": "compare",
          "columns": ["", "Afternoons", "", ""],
          "rows": [
            ["Tue to Thu", "2:00", "3:00", "4:00 · 5:00"],
            ["Friday", "2:00", "3:00", "4:00"],
            ["Saturday", "9:00", "10:00", "11:00"]
          ]
        },
        {
          "type": "prose",
          "text": "Three hours is $157, used however you want across 90 days. Most people take one hour a week for three weeks."
        }
      ],
      "choices": [
        { "label": "Book three hours, $157", "link": "pack-3", "to": "S14", "weight": "primary" },
        { "label": "Just one hour first, $100", "link": "hour-1", "to": "S14" },
        { "label": "This week is already full", "to": "S5c", "weight": "quiet" }
      ]
    },

    "S5c": {
      "name": "Soft Landing",
      "zone": "Depth",
      "note": "Her most common stall isn't price or doubt, it's that this week is genuinely full. Decoupling purchase from scheduling removes the only real obstacle. Highest-ROI recovery in the funnel.",
      "heading": "If this week is too soon, that's alright.",
      "blocks": [
        {
          "type": "prose",
          "text": "The pack is good for 90 days. Buy it now, use the first hour whenever the week lets you.\n\nNothing expires next Tuesday."
        }
      ],
      "choices": [
        { "label": "Get the pack, use it later", "link": "pack-3", "to": "S14", "weight": "primary" },
        {
          "label": "Send me a reminder instead",
          "weight": "quiet",
          "endHeading": "We'll write once.",
          "endText": "A short note in a few weeks, nothing before then."
        }
      ]
    },

    "S6": {
      "name": "Insider",
      "zone": "Branch",
      "surface": "dark",
      "layout": "cinema",
      "countdown": 3,
      "note": "The November cut drops the eight-recliner count and the two-installations line. Scarcity now rests on the closing two lines alone; the middle sells the hosted experience - staff, blankets, a snack and a drink.",
      "eyebrow": "The part we don't put on the website",
      "blocks": [
        {
          "type": "video",
          "id": "V3",
          "src": "assets/media/V3.mp4",
          "hold": true,
          "full": true,
          "seconds": 38,
          "words": 70,
          "script": "Here's the part we don't put on the website.\n\nScalar waves, sound, colour and proclamations, moving together as one. That combination was perfected in 2025.\n\nThe room has soft, relaxing recliners. You're greeted by trained staff who know how much this private, uninterrupted time means to you, offering an elevated ambiance, including warm blankets, a snack and a beverage.\n\nRight now, getting in is easy.\n\nThat is a temporary condition."
        }
      ],
      "choices": [
        { "label": "Continue", "to": "S6a", "weight": "primary" }
      ]
    },

    "S6a": {
      "name": "Founding Class",
      "zone": "Depth",
      "surface": "dark",
      "note": "Same dark surface as S6 so the split reads as one continuous moment rather than two slides.",
      "heading": "Founding Class",
      "blocks": [
        {
          "type": "prose",
          "text": "Richmond, Virginia. Eleven seats, eight of them recliners.\n\nNot a marketing number — the room. And we aren't adding chairs.\n\nFounding Members stay two hours. Everyone else gets one. First call on every hour, and your rate holds for as long as you're a member.\n\nEvery founding seat takes twice the room, so the class is capped. There is no second Founding Class at these prices."
        }
      ],
      "choices": [
        { "label": "Show me the membership tiers", "to": "S10", "weight": "primary" },
        { "label": "What's actually in the room?", "to": "S7c" },
        { "label": "How many spots are left?", "to": "S6b" }
      ]
    },

    "S6b": {
      "name": "The Counter",
      "zone": "Depth",
      "note": "Update the remaining count weekly, real numbers only. If nobody joined, it doesn't move. Never reset it — reset it once and this lead type is gone permanently.",
      "heading": "The Founding Class is capped at 32.",
      "blocks": [
        {
          "type": "counter",
          "remaining": 11,
          "total": 32,
          "label": "Founding places remaining as of 19 September 2026"
        },
        {
          "type": "prose",
          "text": "Eleven seats, eight of them recliners. That's the room, not a marketing number.\n\nThere are two installations of this technology in the United States. Ours is in Richmond. The other is in North Carolina. That's the whole map."
        },
        {
          "type": "aside",
          "text": "Why we cap it: you're paying for an uncrowded room. Founding Members stay two hours, so every founding seat takes twice the room. Fill it past comfortable and we've sold you something else.\n\nWe aren't adding chairs. There is no second Founding Class at these prices."
        }
      ],
      "choices": [
        { "label": "Claim a founding spot", "to": "S10", "weight": "primary" }
      ]
    },

    "S7a": {
      "name": "Every Part",
      "zone": "Branch",
      "surface": "dark",
      "layout": "cinema",
      "countdown": 3,
      "note": "Sets up the focus menu: the six areas the film names are the six tiles on S7, so the visitor arrives there already holding the vocabulary.",
      "eyebrow": "Every part of you",
      "blocks": [
        {
          "type": "video",
          "id": "V4",
          "src": "assets/media/V4.mp4",
          "hold": true,
          "full": true,
          "seconds": 46,
          "words": 77,
          "script": "Here's what makes this different from simply lying down anywhere else.\n\nLife isn't just one thing. It's emotional, mental, physical, social, spiritual, financial, and all of these are connected.\n\nInside the room, multiple proclamations unfold simultaneously. One designed around the bigger picture, others focused on more specific areas of life.\n\nIt's not about choosing just one. It's about making space for all the parts of you.\n\nSame room, same hour. An experience as multi-dimensional as life itself."
        }
      ],
      "choices": [
        { "label": "Choose what my hour is for", "to": "S7", "weight": "primary" }
      ]
    },

    "S7": {
      "name": "Focus Menu",
      "zone": "Branch",
      "note": "Every tile tap is tagged FOCUS_. These taps tell your booking desk how to open the call and tell you which category to build the next ad campaign around.",
      "heading": "You don't just book an hour. You choose what it's for.",
      "blocks": [
        {
          "type": "prose",
          "text": "Every hour is programmed to a focus you pick when you arrive.\n\nGeneral, a broad focus for the whole hour. Specific, narrowed to one area of your life. Precise, built around a single named goal you bring in."
        },
        {
          "type": "tiles",
          "tagPrefix": "FOCUS",
          "screen": {
            "video": ["assets/media/focus-screen.webm", "assets/media/focus-screen.mp4"],
            "poster": "assets/media/focus-screen.jpg"
          },
          "after": "Plus more than a hundred further focuses in the full library. Most systems offer sixteen programs. Your host walks you through the complete menu when you arrive.",
          "items": [
            {
              "name": "Emotional",
              "lede": "Steadiness. Room to breathe.",
              "lines": ["Peace and relaxation", "Releasing stress, worry and uncertainty", "A balanced, centered life"]
            },
            {
              "name": "Mental",
              "lede": "Clarity, and the quiet to actually think.",
              "lines": ["Improve my concentration", "Self-confidence", "Unlock my potential"]
            },
            {
              "name": "Social",
              "lede": "The people you'd like to show up better for.",
              "lines": ["Improve my marital relationship", "Being a better parent", "Being present and patient"]
            },
            {
              "name": "Physical",
              "lede": "Rest, energy, feeling in your body again.",
              "lines": ["Deep rest and recovery", "Everyday energy", "Feeling strong again"]
            },
            {
              "name": "Spiritual",
              "lede": "Stillness, gratitude, time with something larger.",
              "lines": ["Finding peace and tranquility", "Bathing in blessings", "Empowering my relationship with God"]
            },
            {
              "name": "Financial",
              "lede": "The goals you keep meaning to sit down with.",
              "lines": ["Goal setting and achievement", "Maximizing my productivity", "Mastering time management"]
            }
          ]
        }
      ],
      "choices": [
        { "label": "Sounds like me", "to": "S8", "weight": "primary" },
        { "label": "What's actually in the room?", "to": "S7c" },
        { "label": "Show me the memberships", "to": "S10" }
      ]
    },

    "S7c": {
      "name": "Mechanism",
      "zone": "Depth",
      "surface": "dark",
      "layout": "cinema",
      "countdown": 3,
      "note": "The most matter-of-fact of the four scripts - no selling. \"You're not watching a screen. You're inside one.\" gets a full stop on both sides; the last line is almost a shrug, since refusing the claim closes a skeptic harder than asserting one.\n\nEdit sheet (reuses existing shots, no new setups): 0:00-0:05 wide, empty room (L5). 0:05-0:13 unbroken tilt down a tower (L2). 0:13-0:20 tower static, then cut to the opposite tower (L1 x2). 0:20-0:27 recliner from behind, glow ahead (L6). 0:27-0:35 slow pull back, gold lockup (L5 to L11). Requires two separate takes of L1, one of each opposing tower, so the middle stretch can cut between them - that cut is what makes \"facing each other\" visible rather than asserted.\n\nLives on its own slide rather than embedded in S7b: the panels template has no title-card/countdown path, so a video block dropped straight into it would try to autoplay the instant the slide renders, outside any click, and get refused under the no-silent-autoplay policy - landing as a bare play button with none of the build-up V1-V3 get. This keeps that same cinema treatment for V6.",
      "eyebrow": "What's actually in the room",
      "blocks": [
        {
          "type": "video",
          "id": "V6",
          "src": "assets/media/V6.mp4",
          "hold": true,
          "full": true,
          "seconds": 76,
          "words": 87,
          "script": "Here's what's actually happening in the room.\n\nSixteen screens, in towers, facing each other. The light comes from every direction at once, and it meets in the middle — which is where you're sitting.\n\nEach one is precisely engineered and individually programmed. Its own colour, its own sound, its own proclamations, moving through Fibonacci patterns.\n\nWhat fills the room, we call Radiant Waves. Nothing touches you. There's nothing to take.\n\nYou're not watching a screen. You're inside one.\n\nWhat that does for you is yours to find out."
        }
      ],
      "choices": [
        { "label": "Continue", "to": "S7b", "weight": "primary" }
      ]
    },

    "S7b": {
      "name": "In The Room",
      "zone": "Depth",
      "note": "Mechanism lives here and nowhere else — always optional, always behind a click, never in the main path.",
      "heading": "What's actually in the room",
      "blocks": [
        {
          "type": "prose",
          "text": "You don't need to understand any of this to feel it. But people ask, so here it is.\n\nSystems like this have existed for about thirty years. Most of them run light and affirmations as separate layers: one thing, then another thing.\n\nThis one doesn't. Colour, sound, motion and language move together across all sixteen screens as a single continuous thing. That's the part that's new, and it's the part you feel."
        },
        {
          "type": "panels",
          "items": [
            {
              "q": "The screens face each other",
              "a": "Sixteen displays in opposing arrangement, filling the room from both sides rather than lighting it from one direction. It's the reason the room feels enveloping rather than like sitting in front of a television."
            },
            {
              "q": "Colour, light and geometry",
              "a": "Each program carries its own colour signature — deep violets, blues, warm golds — moving through Fibonacci patterns, the flower of life, and golden-ratio forms. The same proportions that turn up in shells, seed heads and galaxies.\n\nPeople have found these shapes calming for roughly as long as people have been looking at them."
            },
            {
              "q": "Sound",
              "a": "Low tonal frequencies, tuned to the room and moving with the light rather than underneath it. Not music. Closer to the sound of a room that's very far from a road."
            },
            {
              "q": "Proclamations",
              "a": "Words, moving through the light. Every screen carries language — gratitude, encouragement, the focus you chose at the door. Most people stop reading them after a few minutes and just let them move."
            }
          ]
        }
      ],
      "choices": [
        { "label": "That's enough, show me times", "to": "S9", "weight": "primary" },
        { "label": "I have more questions", "to": "S12" }
      ],
      "disclaimer": "Radiant Wave Technology does not diagnose, treat, prescribe, or cure anything, and makes no medical claims."
    },

    "S8": {
      "name": "Proof",
      "zone": "Depth",
      "heading": "What actually happens in there",
      "blocks": [
        {
          "type": "prose",
          "text": "Nothing dramatic. That's rather the point.\n\nYou arrive. You pick your focus. You get a recliner, a blanket, and low light. The screens come up. Somebody brings you something warm.\n\nThen for sixty minutes, the only thing on your calendar is nothing.\n\nMost first-timers fall asleep. Most are a little embarrassed about it. We tell them that's the highest compliment the room gets."
        },
        {
          "type": "plates",
          "items": [
            { "src": "assets/media/lounge-floor.jpg", "note": "The Lounge floor: recliners and screen towers." }
          ]
        }
      ],
      "choices": [
        { "label": "I want to try it. What's it cost?", "to": "S9", "weight": "primary" },
        { "label": "I'd rather go straight to membership", "to": "S10" }
      ]
    },

    "S8b": {
      "name": "Testimonials",
      "zone": "Depth",
      "parked": true,
      "note": "PARKED until written releases are signed. Three maximum, experience only — no conditions, no symptoms, no before-and-afters. \"I slept like I haven't in a year\" is fine. \"My back pain went away\" is not, cut it even if she said it. Attribution reads: Karen M., Midlothian.",
      "heading": "What members say",
      "blocks": [
        {
          "type": "prose",
          "text": "This slide is not built yet. It goes live once releases are signed."
        }
      ],
      "choices": [
        { "label": "I want to try it", "to": "S9", "weight": "primary" }
      ]
    },

    "S9": {
      "name": "A La Carte",
      "zone": "Offer",
      "note": "Volunteering the better deal costs a little pack margin and buys a lot of trust, which you convert at S10.",
      "heading": "Try it before you commit to anything.",
      "blocks": [
        {
          "type": "prose",
          "text": "Standard Lounge access is $100 an hour. These packs must be used within 90 days."
        },
        {
          "type": "ladder",
          "label": "Hour packs",
          "rowLabels": ["Price", "Per hour", "Good for"],
          "items": [
            { "id": "hour-1", "name": "Single hour", "price": 100, "unit": "$100 an hour", "note": "Walk in, see for yourself" },
            { "id": "pack-3", "name": "Three-hour pack", "price": 157, "unit": "$52 an hour", "note": "Most people start here", "default": true },
            { "id": "pack-10", "name": "Ten-hour pack", "price": 379, "unit": "$38 an hour", "note": "Best value before membership" }
          ]
        },
        {
          "type": "aside",
          "text": "Worth knowing before you choose: Vita Recharge is $397 a month for 20 hours. That's less per hour than any pack above, and it renews.\n\nMost people buy the three-hour pack, come back twice, and switch to membership within the month. We'd rather tell you now than let you find out later."
        }
      ],
      "choices": [
        { "label": "Book the {offer}", "note": "{offerPrice}", "link": "offer", "to": "S14", "weight": "primary" },
        { "label": "Compare memberships first", "to": "S10" }
      ]
    },

    "S10": {
      "name": "Memberships",
      "zone": "Offer",
      "note": "Restore wins because it's flanked: Recharge makes it look generous, Radiate makes it look sensible, and the guest pass gives it a feature Recharge lacks. Expect around 55% here.",
      "heading": "Three ways to belong.",
      "blocks": [
        {
          "type": "prose",
          "text": "All memberships require autopay with a six-month minimum. Founding rates hold for as long as you're a member."
        },
        {
          "type": "ladder",
          "label": "Membership tiers",
          "rowLabels": ["Price", "Hours", "What's included"],
          "items": [
            {
              "id": "vita-recharge",
              "name": "Vita Recharge",
              "price": 397,
              "period": "a month",
              "unit": "20 hours, $19.85 an hour",
              "note": "20 hours at our standard $100 rate is $2,000 of access.\nMember booking window. Founding rate locked."
            },
            {
              "id": "vita-restore",
              "name": "Vita Restore",
              "price": 597,
              "period": "a month",
              "unit": "36 hours, $16.58 an hour",
              "default": true,
              "note": "36 hours at our standard rate is $3,600 of access.\nPriority booking. One guest pass monthly. Founding rate locked."
            },
            {
              "id": "vita-radiate",
              "name": "Vita Radiate",
              "price": 897,
              "period": "a month",
              "unit": "Unlimited",
              "note": "At three visits a week you're past $1,200 of access, and nowhere near a ceiling.\nFirst priority booking. Two guest passes monthly. First position in the delivery order."
            }
          ]
        }
      ],
      "choices": [
        { "label": "Start {offer}", "note": "{offerPrice} a month, six-month minimum", "link": "offer", "to": "S14", "weight": "primary" },
        { "label": "I have a question first", "to": "S12" },
        { "label": "Show me the hour packs instead", "to": "S9", "weight": "quiet" }
      ]
    },

    "S11": {
      "name": "Systems",
      "zone": "Offer",
      "wide": true,
      "heading": "Bring it home.",
      "blocks": [
        {
          "type": "prose",
          "text": "The same technology that's in the Lounge, in three residential configurations. Introductory pricing ends 31 October 2026."
        },
        {
          "type": "compare",
          "caption": "Plus applicable Virginia sales tax.",
          "columns": ["", "Advanced", "Elite", "Elite II"],
          "rows": [
            ["Screens", "Four 27-inch", "Four 32-inch", "Eight 32-inch, stacked"],
            ["Surface", "~1,200 sq in", "~1,700 sq in", "~3,400 sq in"],
            ["MSRP", "$49,997", "$55,997", "$69,997"],
            ["Introductory", "$26,999", "$31,999", "$39,999"],
            ["Per square inch", "$22.50", "$18.82", "$11.76"]
          ]
        },
        {
          "type": "aside",
          "text": "Elite II costs 25% more than Elite and delivers twice the screen surface. Per square inch, it's roughly half the cost of Advanced. If the room can take it, it's not a close call."
        }
      ],
      "choices": [
        { "label": "Advanced", "note": "$26,999", "to": "S11a", "set": { "system": "Advanced" } },
        { "label": "Elite", "note": "$31,999", "to": "S11b", "set": { "system": "Elite" } },
        { "label": "Elite II", "note": "$39,999, best value", "to": "S11c", "weight": "primary", "set": { "system": "Elite II" } },
        { "label": "Book the three hours first, $157", "to": "S9", "weight": "quiet" }
      ]
    },

    "S11a": {
      "name": "Advanced",
      "zone": "Offer",
      "heading": "Advanced Residential System",
      "blocks": [
        { "type": "spec", "text": "Four 27-inch screens, around 1,200 square inches, built for medium rooms" },
        {
          "type": "price",
          "was": "MSRP $49,997",
          "now": "$26,999",
          "sub": "You save $22,998. Ends 31 October 2026, plus Virginia sales tax."
        },
        {
          "type": "prose",
          "text": "Fully wireless, with full audio. The entry point into ownership, and the configuration most people choose for a spare room, a den, or a bedroom.\n\nIncluded: four 27-inch screens and mounting hardware, full wireless audio, professional delivery and installation, on-site setup and training, the full library of more than a hundred focuses, a one-year manufacturer warranty, and ongoing support."
        },
        {
          "type": "aside",
          "text": "Considering the step up? Elite II delivers nearly three times this screen surface for $13,000 more, at roughly half the cost per square inch."
        },
        {
          "type": "plates",
          "items": [
            { "src": "assets/media/system-advanced.jpg", "whole": true, "alt": "The Advanced system: four 27-inch screens on stands, about 1,200 square inches of screen surface, $26,999 introductory, $22.50 per square inch." }
          ]
        }
      ],
      "choices": [
        { "label": "Book a call about Advanced", "link": "call", "to": "S16", "weight": "primary", "set": { "system": "Advanced" } },
        { "label": "Compare with Elite II", "to": "S11c" }
      ]
    },

    "S11b": {
      "name": "Elite",
      "zone": "Offer",
      "heading": "Elite Residential System",
      "blocks": [
        { "type": "spec", "text": "Four 32-inch screens, around 1,700 square inches, built for larger rooms" },
        {
          "type": "price",
          "was": "MSRP $55,997",
          "now": "$31,999",
          "sub": "You save $23,998. Ends 31 October 2026, plus Virginia sales tax."
        },
        {
          "type": "prose",
          "text": "Same four-screen architecture as Advanced, stepped up to 32-inch panels. About 40% more screen surface, for a room that can carry it."
        },
        {
          "type": "aside",
          "text": "Before you decide: Elite II is $8,000 more and delivers double this screen surface. If you have the room, it's the better buy, and we'd rather tell you that now."
        },
        {
          "type": "plates",
          "items": [
            { "src": "assets/media/system-elite.jpg", "whole": true, "alt": "The Elite system: four 32-inch screens on stands, about 1,700 square inches of screen surface, $55,997 MSRP, $18.82 per square inch." }
          ]
        }
      ],
      "choices": [
        { "label": "Book a call about Elite", "link": "call", "to": "S16", "weight": "primary", "set": { "system": "Elite" } },
        { "label": "Show me Elite II", "to": "S11c" }
      ]
    },

    "S11c": {
      "name": "Elite II",
      "zone": "Offer",
      "heading": "Elite II Residential System",
      "blocks": [
        { "type": "spec", "text": "Eight 32-inch screens, double-stacked, around 3,400 square inches, extra-large rooms" },
        {
          "type": "price",
          "was": "MSRP $69,997",
          "now": "$39,999",
          "sub": "You save $29,998. Ends 31 October 2026, plus Virginia sales tax."
        },
        {
          "type": "prose",
          "text": "Our largest residential configuration, and the closest thing to the Lounge you can put in a house. Eight 32-inch screens in a double-stacked opposing arrangement, twice the surface of Elite at 25% more.\n\nHalf the Lounge, in your own room, on your own schedule."
        },
        {
          "type": "aside",
          "text": "The value case: $11.76 per square inch of screen surface, against $22.50 for Advanced. Elite II is the least expensive way to own this technology at scale."
        },
        {
          "type": "plates",
          "items": [
            { "src": "assets/media/system-elite-2.jpg", "whole": true, "alt": "The Elite II system: eight 32-inch screens stacked in a wall, about 3,400 square inches of screen surface, $39,999 introductory, $11.76 per square inch." }
          ]
        }
      ],
      "choices": [
        { "label": "Book a call about Elite II", "link": "call", "to": "S16", "weight": "primary", "set": { "system": "Elite II" } },
        { "label": "Book three hours in the Lounge first, $157", "to": "S9", "weight": "quiet" }
      ]
    },

    "S12": {
      "name": "Objections",
      "zone": "Recovery",
      "note": "The most valuable non-offer slide in the build. It sits under S10 catching everyone who hesitates at the price and recovers 30-40% of them. Every panel concedes before reframing, and every panel offers a smaller step.",
      "heading": "What's holding you back?",
      "blocks": [
        {
          "type": "prose",
          "text": "Pick the honest one. We'll answer it straight and you can decide."
        },
        {
          "type": "panels",
          "items": [
            {
              "q": "I don't know if it'll do anything for me.",
              "a": "Then don't guess. Come find out for $157.\n\nThree hours, used whenever you want across 90 days. Come once. If it's not for you, you've spent $157 and an afternoon, and we'll shake your hand on the way out. Nobody here is going to chase you.\n\nBut most people who say this book a second hour before they've left the parking lot."
            },
            {
              "q": "Is there any actual science behind this?",
              "a": "Short answer: some, and less than you'll be told.\n\nThe combination is new — scalar, sound, colour and proclamation together, perfected in 2025. There's early measurement work on systems in this category, but it's small-scale and hasn't been through peer review, so we're not going to wave it at you as proof of anything. If you want to read it yourself, ask and we'll send it.\n\nHere's what we'll say with confidence. The room is dark, quiet, and comfortable. It's sixty minutes with no phone and nobody who needs anything from you. Whatever else is or isn't happening in there, that hour is real, and most people find it does something for them.\n\nWhich is exactly why three hours costs $157 instead of $2,000. We'd rather you test it than take our word for it."
            },
            {
              "q": "$397 a month is a lot of money.",
              "a": "It is. So let's be specific about what it is.\n\nIt's $13 a day. Less than most people spend on coffee and takeout in a week. And it buys twenty hours a month of something you currently get zero hours of.\n\nThe real question isn't whether $397 is a lot. It's whether twenty uninterrupted hours a month are worth more than whatever that $397 is currently going toward.\n\nAnd if the answer is not yet, that's completely fine. Start with three hours for $157 and decide after."
            },
            {
              "q": "I don't have time.",
              "a": "Nobody who books this has time. That's the entire reason it works.\n\nMembers don't find an extra hour. They take one that was already being spent badly: the scroll before bed, the hour of half-watching something with a phone in hand.\n\nOne hour. Once a week. You already have it. It's just currently going somewhere that doesn't give anything back."
            }
          ]
        }
      ],
      "choices": [
        { "label": "Book three hours, $157", "to": "S9", "weight": "primary" },
        { "label": "See all three tiers", "to": "S10" },
        { "label": "Book a call", "link": "call", "to": "S16" }
      ]
    },

    "S12b": {
      "name": "Spouse",
      "zone": "Recovery",
      "note": "The only slide that manufactures new leads. Every share is a fresh entry at the welcome screen with pre-built social proof. Reached from the S14 confirmation.",
      "heading": "Good. You should.",
      "blocks": [
        {
          "type": "prose",
          "text": "Send them this. The link works for them too, and it'll answer their questions better than a summary over dinner will.\n\nAnd if it's easier, bring them. Vita Restore and Radiate both include guest passes, so their first hour is on us."
        }
      ],
      "choices": [
        {
          "label": "Send this to someone",
          "weight": "primary",
          "handoff": false,
          "endHeading": "Copy the link from your address bar.",
          "endText": "It drops them at the start, and they get sorted the same way you were."
        },
        { "label": "Reserve a spot instead", "to": "S13" }
      ]
    },

    "S13": {
      "name": "Reservation",
      "zone": "Capture",
      "note": "Never pre-check the consent box. Room dimensions is the highest-value field on this branch — someone who can name a room has already picked it.",
      "heading": "You're early. That's the whole advantage.",
      "blocks": [
        {
          "type": "prose",
          "text": "Reserving now holds your delivery position and locks founding Lounge rates in the meantime."
        },
        { "type": "summary" },
        {
          "type": "form",
          "role": "capture",
          "submit": "Hold my place",
          "consent": "Yes, contact me by phone, text and email. Message and data rates may apply. Reply STOP to opt out.",
          "consentRequired": true,
          "fields": [
            { "name": "firstName", "label": "First name", "required": true },
            { "name": "lastName", "label": "Last name", "required": true },
            { "name": "email", "label": "Email", "type": "email", "required": true },
            { "name": "mobile", "label": "Mobile", "type": "tel", "required": true },
            {
              "name": "system", "label": "Which system?", "type": "select",
              "options": ["Not sure yet", "Advanced", "Elite", "Elite II"]
            },
            {
              "name": "roomReady", "label": "Dedicated room in mind?", "type": "select",
              "options": ["Not yet", "Roughly", "Yes, a specific room"]
            },
            { "name": "roomSize", "label": "Room dimensions, roughly", "full": true }
          ],
          "done": {
            "heading": "Your place is held.",
            "text": "Someone from the Richmond team will call within one business day to confirm the position and answer whatever's still open.",
            "to": "S10",
            "toLabel": "See the membership tiers while you wait"
          }
        }
      ]
    },

    "S14": {
      "name": "Close",
      "zone": "Capture",
      "note": "Five fields maximum. Every extra one costs conversions.",
      "heading": "Welcome to the Lounge.",
      "blocks": [
        {
          "type": "prose",
          "text": "One more step and you're in. Someone from our Richmond team will reach out within one business day to get your first hour on the calendar and walk you through choosing your focus."
        },
        { "type": "summary" },
        {
          "type": "form",
          "role": "capture",
          "submit": "Confirm my spot",
          "consent": "Yes, contact me by phone, text and email. Reply STOP to opt out.",
          "consentRequired": true,
          "footnote": "Radiant Wave Technology does not diagnose, treat, prescribe, or cure anything, and makes no medical claims.",
          "fields": [
            { "name": "firstName", "label": "First name", "required": true },
            { "name": "lastName", "label": "Last name", "required": true },
            { "name": "email", "label": "Email", "type": "email", "required": true },
            { "name": "mobile", "label": "Mobile", "type": "tel", "required": true },
            { "name": "preferred", "label": "Preferred day and time", "full": true }
          ],
          "done": {
            "heading": "You're in.",
            "text": "Check your email, and clear an hour. You'll want the whole thing.",
            "to": "S12b",
            "toLabel": "Know someone who'd want this?"
          }
        }
      ]
    },

    "S15": {
      "name": "Two Ways",
      "parked": true,   // online system checkout; systems now go to a GHL call (config.js -> ghl.call)
      "zone": "Offer",
      "wide": true,
      "note": "Pricing is fixed, so the cash path can't be discounted. The incentive stack carries it instead, and the complimentary membership is nearly free to you and the strongest item on the list.",
      "heading": "Two ways to own it.",
      "blocks": [
        {
          "type": "prose",
          "text": "Reserve with half: 50% today, balance in three equal monthly payments, thirty days apart, no interest, card or ACH on file."
        },
        {
          "type": "compare",
          "columns": ["", "Today", "Then"],
          "rows": [
            ["Advanced", "$13,499", "$4,500 × 3"],
            ["Elite", "$16,000", "$5,333 × 3"],
            ["Elite II", "$20,001", "$6,666 × 3"]
          ]
        },
        {
          "type": "aside",
          "text": "Paid in full: one payment, first position in the delivery order.\n\nAlso receives priority delivery, an extended warranty, a second training session, complimentary Lounge membership until your system is installed, and Founding Owner designation."
        }
      ],
      "choices": [
        { "label": "Pay in full", "note": "First position in the delivery order", "to": "S17", "weight": "primary", "set": { "paymentPath": "Paid in full" } },
        { "label": "Reserve with half", "to": "S17", "set": { "paymentPath": "Reserve with half" } },
        { "label": "Talk to someone first", "link": "call", "to": "S16" },
        { "label": "Which system fits my space?", "link": "call", "to": "S16", "weight": "quiet" }
      ]
    },

    "S16": {
      "name": "Talk First",
      "zone": "Capture",
      "heading": "Let's make sure it fits the room.",
      "blocks": [
        {
          "type": "prose",
          "text": "Five-figure systems shouldn't be bought off a web page. Tell us about your space and someone will call within one business day."
        },
        {
          "type": "form",
          "role": "capture",
          "submit": "Request the call",
          "consent": "Yes, contact me by phone, text and email. Reply STOP to opt out.",
          "consentRequired": true,
          "fields": [
            { "name": "firstName", "label": "First name", "required": true },
            { "name": "lastName", "label": "Last name", "required": true },
            { "name": "email", "label": "Email", "type": "email", "required": true },
            { "name": "mobile", "label": "Mobile", "type": "tel", "required": true },
            {
              "name": "system", "label": "System of interest", "type": "select",
              "options": ["Not sure yet", "Advanced", "Elite", "Elite II"]
            },
            {
              "name": "timeline", "label": "Timeline", "type": "select",
              "options": ["This month", "One to three months", "Exploring"]
            },
            { "name": "roomSize", "label": "Room dimensions, roughly", "full": true }
          ],
          "done": {
            "heading": "We'll call you.",
            "text": "Within one business day, from a Richmond number."
          }
        }
      ]
    },

    "S17": {
      "name": "Order",
      "parked": true,   // see S15
      "zone": "Capture",
      "note": "Final-sale terms go above the button, never below. High-ticket buyers accept them routinely when told up front; discovering it afterward is a chargeback.",
      "heading": "Before you order",
      "blocks": [
        {
          "type": "panels",
          "items": [
            {
              "q": "What your deposit reserves",
              "a": "Your position in the delivery order, and the introductory price on the configuration you selected, held against future increases."
            },
            {
              "q": "Payment dates",
              "a": "If you reserve with half, the balance is taken in three equal payments at thirty, sixty and ninety days from today, from the card or account on file. No interest."
            },
            {
              "q": "All system sales are final",
              "a": "Systems carry a full one-year manufacturer warranty covering defects. Outside of warranty claims, system sales are not refundable."
            },
            {
              "q": "Delivery and installation",
              "a": "Professional delivery, installation, on-site setup and training are included. Your installation window is confirmed by phone once the order is placed."
            }
          ]
        },
        {
          "type": "aside",
          "text": "Not certain? Book three hours in the Lounge first for $157, credited in full toward any system reserved within 90 days."
        },
        { "type": "summary" },
        {
          "type": "form",
          "role": "capture",
          "submit": "Complete my order",
          "consent": "I've read and agree to the purchase agreement, and I understand that system sales are final.",
          "consentRequired": true,
          "footnote": "Radiant Wave Technology does not diagnose, treat, prescribe, or cure anything, and makes no medical claims.",
          "fields": [
            { "name": "firstName", "label": "First name", "required": true },
            { "name": "lastName", "label": "Last name", "required": true },
            { "name": "email", "label": "Email", "type": "email", "required": true },
            { "name": "mobile", "label": "Mobile", "type": "tel", "required": true },
            { "name": "billingZip", "label": "Billing ZIP", "required": true }
          ],
          "done": {
            "heading": "Order received.",
            "text": "Someone will call within one business day to take payment securely and confirm your delivery window. Nothing is charged from this page."
          }
        }
      ],
      "choices": [
        { "label": "Book three hours first, $157", "to": "S9", "weight": "quiet" }
      ]
    }
  }
};
