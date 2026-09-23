/* ==================================================================
   RWT-iDecide - engine

   Loads a funnel definition, walks a visitor through it, and keeps a
   record of how they were sorted. Nothing leaves the browser until
   the visitor submits a capture form; then the whole record goes to
   the CRM in one payload.

   Public surface:
     IDecide.start()            boot from config
     IDecide.record             the live record (also on window for debugging)
   ================================================================== */

(function (window, document) {
  'use strict';

  var CFG = window.IDECIDE_CONFIG || {};
  var B = window.IDecideBlocks;
  var el = B.el;

  var QS = new URLSearchParams(window.location.search);
  var DEBUG_ON = QS.get('debug') === '1';
  var debug = {
    showBuildNotes: DEBUG_ON || !!(CFG.debug && CFG.debug.showBuildNotes),
    showSlideIds: DEBUG_ON || !!(CFG.debug && CFG.debug.showSlideIds),
    validateOnLoad: !!(CFG.debug && CFG.debug.validateOnLoad)
  };

  var funnel = null;
  var root = null;
  var back = null;
  var bg = null;

  /* ==================================================================
     THE RECORD
     Everything the funnel learns about one visitor, in one object.
     Survives a refresh via sessionStorage; cleared when the tab closes.
     ================================================================== */

  var Record = {
    state: null,

    init: function (funnelId) {
      this.key = 'idecide:' + funnelId;
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(this.key)); } catch (e) { /* private mode */ }

      this.state = saved || {
        funnel: funnelId,
        startedAt: new Date().toISOString(),
        identity: {},
        fields: {},
        tags: [],
        path: [],
        choices: [],
        notes: [],
        offer: null,
        entry: {
          referrer: document.referrer || null,
          landing: window.location.href,
          utm: utm()
        }
      };
      this.save();
      return this;
    },

    save: function () {
      try { sessionStorage.setItem(this.key, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
    },

    /* --- path ---------------------------------------------------- */
    visit: function (slideId) {
      var p = this.state.path;
      if (p[p.length - 1] !== slideId) p.push(slideId);
      this.save();
    },

    /* --- tags ---------------------------------------------------- */
    hasTag: function (tag) { return this.state.tags.indexOf(tag) !== -1; },

    addTag: function (tag) {
      if (tag && !this.hasTag(tag)) { this.state.tags.push(tag); this.save(); }
    },

    toggleTag: function (tag) {
      var i = this.state.tags.indexOf(tag);
      if (i === -1) this.state.tags.push(tag); else this.state.tags.splice(i, 1);
      this.save();
      return i === -1;
    },

    /* --- choices ------------------------------------------------- */
    choose: function (slideId, choice) {
      this.state.choices.push({
        slide: slideId,
        label: choice.label,
        to: choice.to || null,
        tag: choice.tag || null,
        at: new Date().toISOString()
      });
      if (choice.tag) this.addTag(choice.tag);
      /* A choice can also record a value, so a later slide knows which
         system or payment path the visitor picked without asking again. */
      if (choice.set) this.fill(choice.set);
      this.save();
    },

    note: function (kind, detail) {
      this.state.notes.push({ kind: kind, detail: detail, at: new Date().toISOString() });
      this.save();
    },

    setOffer: function (offer) {
      this.state.offer = offer;
      this.save();
      /* Anything on screen that names the offer has to follow it. */
      if (this.onChange) this.onChange();
    },

    /* --- identity ------------------------------------------------ */
    fill: function (values) {
      var idKeys = ['firstName', 'lastName', 'email', 'phone', 'mobile'];
      var self = this;
      Object.keys(values).forEach(function (k) {
        if (idKeys.indexOf(k) !== -1) self.state.identity[k] = values[k];
        else self.state.fields[k] = values[k];
      });
      this.save();
    },

    known: function (name) {
      return this.state.identity[name] || this.state.fields[name] || '';
    },

    /* --- handoff ------------------------------------------------- */
    payload: function () {
      var s = this.state;
      var started = new Date(s.startedAt).getTime();
      return {
        funnel: s.funnel,
        funnelName: funnel.meta.name,
        submittedAt: new Date().toISOString(),
        startedAt: s.startedAt,
        durationSeconds: Math.round((Date.now() - started) / 1000),
        identity: s.identity,
        tags: s.tags.slice(),
        offer: s.offer,
        fields: s.fields,
        /* How they were sorted, in order. This is the part a slide
           deck cannot give you and a booking desk actually reads. */
        path: s.path.slice(),
        choices: s.choices.slice(),
        notes: s.notes.slice(),
        entry: s.entry
      };
    },

    handoff: function (formBlock) {
      var body = this.payload();
      body.capturedAt = formBlock.role;
      body.capturedOn = currentId;

      var url = (CFG.handoff && CFG.handoff.webhookUrl) || '';

      if (!url) {
        console.groupCollapsed('%c[iDecide] lead ready - no webhook configured', 'color:#9A5527');
        console.log(body);
        console.info('Paste the GoHighLevel webhook URL into config.js -> handoff.webhookUrl to send this.');
        console.groupEnd();
        showPayload(body);
        return Promise.resolve({ ok: true, delivered: false });
      }

      return post(url, body)
        .then(function () { return { ok: true, delivered: true }; })
        .catch(function (err) {
          console.error('[iDecide] handoff failed', err);
          try { sessionStorage.setItem('idecide:pending', JSON.stringify(body)); } catch (e) { /* ignore */ }
          return {
            ok: false,
            message: 'That did not go through. Check your connection and send it again.'
          };
        });
    }
  };

  function post(url, body) {
    var ctrl = new AbortController();
    var ms = (CFG.handoff && CFG.handoff.timeoutMs) || 8000;
    var t = setTimeout(function () { ctrl.abort(); }, ms);

    return fetch(url, {
      method: (CFG.handoff && CFG.handoff.method) || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    }).then(function (res) {
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    }).catch(function (err) {
      clearTimeout(t);
      if (CFG.handoff && CFG.handoff.retry && !post._retried) {
        post._retried = true;
        return post(url, body);
      }
      throw err;
    });
  }

  function utm() {
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (QS.get(k)) out[k.replace('utm_', '')] = QS.get(k);
    });
    return out;
  }

  /* ==================================================================
     ROUTING
     Hash routing so the funnel runs from any static host, and so a
     visitor can be sent straight to a branch with a link.
     ================================================================== */

  var currentId = null;

  function idFromHash() {
    var h = window.location.hash.replace(/^#\/?/, '');
    return h || null;
  }

  function navigate(slideId) {
    if (!slideId) return;
    if (idFromHash() === slideId) { render(slideId); return; }
    window.location.hash = '/' + slideId;
  }

  /* ==================================================================
     RENDER
     ================================================================== */

  function ctx() {
    return { record: Record, navigate: navigate, debug: debug, funnel: funnel };
  }

  /* ==================================================================
     SLIDE TRANSITION
     The outgoing slide fades before the incoming one is built, so a
     change of screen reads as a dissolve rather than a cut. The
     surface changes at the top of the fade, so the ground and the
     content cross over together instead of the page snapping from
     cream to dark after the words have gone.
     ================================================================== */
  var LEAVE_MS = 200;
  var renderToken = 0;

  function render(slideId) {
    var slide = funnel.slides[slideId];
    if (!slide) {
      console.warn('[iDecide] no slide "' + slideId + '", falling back to start');
      navigate(funnel.meta.start);
      return;
    }

    var stage = root.querySelector('.stage');
    var leaving = stage.querySelector('.slide');
    var token = ++renderToken;

    if (!leaving || reduceMotion()) { paint(slideId, slide); return; }

    document.body.classList.toggle('is-dark', slide.surface === 'dark');
    stage.classList.add('is-leaving');

    setTimeout(function () {
      /* A faster click started another transition; that one wins. */
      if (token !== renderToken) return;
      stage.classList.remove('is-leaving');
      paint(slideId, slide);
    }, LEAVE_MS);
  }

  function paint(slideId, slide) {
    currentId = slideId;
    Record.visit(slideId);
    document.title = slide.name
      ? slide.name + ' - ' + funnel.meta.name
      : funnel.meta.name;

    var stage = root.querySelector('.stage');
    /* Leaving a film part-way through still has to hand the level
       back, or the music stays quiet for the rest of the funnel. */
    if (window.Music && slide.layout !== 'cinema') window.Music.duck(false);
    stage.innerHTML = '';
    /* Cleared before blocks render, because a ladder's default selection
       fires an offer change while the new slide is still being built. */
    liveChoices = [];

    /* surface:dark takes the whole page, not just a panel. */
    document.body.classList.toggle('is-dark', slide.surface === 'dark');
    setBackground(slide.background);

    /* Default layout is two columns: the heading holds the left, and
       everything the visitor reads or touches runs down the right.
       A single stacked column wastes most of a desktop screen. */
    var layout = slide.layout || 'editorial';

    var article = el('article', 'slide slide--' + layout +
      (slide.wide ? ' slide--wide' : '') +
      (slide.kind === 'entry' ? ' slide--entry' : ''));
    article.setAttribute('aria-labelledby', 'slide-head');

    if (debug.showSlideIds) {
      article.appendChild(el('p', 'slideid', slideId + '  ' + (slide.zone || '')));
    }
    if (debug.showBuildNotes && slide.note) {
      var bn = el('div', 'buildnote');
      bn.appendChild(el('b', null, 'Build note'));
      bn.appendChild(document.createTextNode(slide.note));
      article.appendChild(bn);
    }

    /* The room is dark; the page is daylight. Slides that are the room
       wrap their editorial content in the dark surface. */
    var host = article;
    var choiceHost = null;
    var film = null;
    var titleCard = null;
    if (slide.tone === 'room') {
      host = el('div', 'room');
      article.appendChild(host);
    }

    if (slide.eyebrow) {
      var eb = el('p', 'eyebrow');
      String(slide.eyebrow).split('\n').forEach(function (line, i) {
        if (i === 0) eb.appendChild(document.createTextNode(line));
        else eb.appendChild(el('span', null, line));
      });
      host.appendChild(eb);
    }

    if (slide.heading) {
      var h = el(slide.kind === 'entry' ? 'h1' : 'h2', 'head', slide.heading);
      h.id = 'slide-head';
      host.appendChild(h);
    }

    if (layout === 'split') {
      /* The sign-in: pitch on the left, panel on the right. */
      var left = el('div', 'split__text');
      var right = el('div', 'split__panel');
      while (host.firstChild) left.appendChild(host.firstChild);

      (slide.blocks || []).forEach(function (block) {
        (block.type === 'form' ? right : left).appendChild(B.render(block, ctx()));
      });
      liftLogo(left);
      host.appendChild(left);
      host.appendChild(right);

    } else if (layout === 'cinema') {
      /* The film is the whole composition: a title card on black,
         which dissolves into the picture, and the way onward appears
         in the middle once it has played. */
      film = el('div', 'film');
      var eb = host.querySelector('.eyebrow');
      if (eb) {
        titleCard = el('div', 'titlecard');
        titleCard.appendChild(eb);
        if (slide.countdown) {
          var cd = el('div', 'countdown');
          cd.appendChild(el('span', 'countdown__n'));
          titleCard.appendChild(cd);
        }
        film.appendChild(titleCard);
      }
      (slide.blocks || []).forEach(function (block) {
        film.appendChild(B.render(block, ctx()));
      });
      host.appendChild(film);
      choiceHost = film;

    } else {
      /* Editorial: the heading takes the left column and holds it,
         everything else runs down the right. */
      var cols = el('div', 'cols');
      var head = el('div', 'cols__head');
      var body = el('div', 'cols__body');
      while (host.firstChild) head.appendChild(host.firstChild);

      (slide.blocks || []).forEach(function (block) {
        body.appendChild(B.render(block, ctx()));
      });

      liftLogo(body);
      cols.appendChild(head);
      cols.appendChild(body);
      host.appendChild(cols);
      /* Actions belong at the foot of the column the visitor is
         reading, not stranded under an empty half of the screen. */
      choiceHost = body;
    }

    /* Choices sit on whichever surface the slide is using, so a room
       slide keeps its buttons inside the dark panel. */
    if (slide.choices && slide.choices.length) {
      var choices = renderChoices(slideId, slide);
      (choiceHost || host).appendChild(choices);

      /* A film slide holds its choices back until the video finishes,
         so the only thing on screen while it plays is the room. */
      var held = (slide.blocks || []).some(function (b) {
        return b.type === 'video' && b.hold;
      });
      if (held) {
        choices.hidden = true;
        /* Announced rather than focused: stealing focus onto the button
           puts a ring on it that reads as a rendering fault. */
        choices.setAttribute('aria-live', 'polite');
        article.addEventListener('film:end', function () {
          if (window.Music) window.Music.duck(false);
          if (film) film.classList.add('is-ended');
          choices.hidden = false;
          choices.classList.add('choices--revealed');
        }, { once: true });
      }
    }

    stage.appendChild(article);
    if (back) back.hidden = Record.state.path.length < 2;

    /* Nothing plays until the title card has had its moment. Run this
       after the slide is in the document, so the browser has a
       starting style to fade from. */
    var reel = article.querySelector('.reel');
    if (reel) rollFilm(film, titleCard, reel, slide.countdown || 0);
    window.scrollTo(0, 0);

    var focusTarget = article.querySelector('.head') || article;
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }

  /* Choice labels may reference what the visitor has already picked:
     "Start {offer}" becomes "Start Vita Restore". Unresolved tokens
     fall back to a neutral word rather than printing braces. */
  function fill(text) {
    if (!text || text.indexOf('{') === -1) return text;
    var s = Record.state;
    return text
      .replace(/\{offer\}/g, s.offer ? s.offer.name : 'your membership')
      .replace(/\{offerPrice\}/g, s.offer ? '$' + s.offer.price.toLocaleString('en-US') : '')
      .replace(/\{system\}/g, s.fields.system || 'your system')
      .replace(/\{firstName\}/g, s.identity.firstName || 'there');
  }

  /* Choices whose text references a token are re-filled whenever the
     thing they reference changes, so a CTA never names a stale offer. */
  var liveChoices = [];

  Record.onChange = function () {
    liveChoices.forEach(function (o) {
      o.text.firstChild.nodeValue = fill(o.choice.label);
      if (o.note) o.note.textContent = fill(o.choice.note);
    });
  };

  function renderChoices(slideId, slide) {
    var wrap = el('div', 'choices');
    /* How many there are decides whether they sit two, three or four
       across. Exits are pulled out of the count - they always get
       their own line. */
    var acting = slide.choices.filter(function (c) { return (c.weight || 'secondary') !== 'quiet'; });
    wrap.dataset.count = acting.length;
    wrap.dataset.longest = acting.reduce(function (n, c) {
      return Math.max(n, String(c.label).length);
    }, 0) > 42 ? 'long' : 'short';

    slide.choices.forEach(function (c, i) {
      var weight = c.weight || 'secondary';
      var terminal = !c.to;
      var btn = el('button', 'choice choice--' + weight + (terminal ? ' choice--end' : ''));
      btn.type = 'button';
      /* drives the staggered entrance */
      btn.style.setProperty('--i', i);

      var text = el('span', 'choice__text');
      text.appendChild(document.createTextNode(fill(c.label)));
      var note = c.note ? el('span', 'choice__note', fill(c.note)) : null;
      if (note) text.appendChild(note);
      if (/\{/.test(c.label) || (c.note && /\{/.test(c.note))) {
        liveChoices.push({ choice: c, text: text, note: note });
      }
      btn.appendChild(text);

      /* Number keys still select, but nothing on the button says so -
         the keycaps were clutter on a page that is mostly buttons. */
      if (weight !== 'quiet' && i < 9) {
        btn.setAttribute('aria-keyshortcuts', String(i + 1));
      }

      btn.addEventListener('click', function () {
        commit(wrap, btn, function () {
          Record.choose(slideId, c);
          if (c.to) navigate(c.to);
          else endHere(btn, c);
        });
      });

      wrap.appendChild(btn);
    });

    return wrap;
  }

  /* A mark belongs above the words, whatever order the JSON put the
     blocks in - it is a letterhead, not a paragraph. */
  function liftLogo(column) {
    var mark = column.querySelector('.logo');
    if (mark && column.firstChild !== mark) column.insertBefore(mark, column.firstChild);
  }

  /* ==================================================================
     BACKGROUND FILM
     A slide can put a film behind the whole page - the sign-in does.
     Muted and looping, because that is the only kind of autoplay a
     browser allows unasked, and it carries no sound worth hearing.
     ================================================================== */
  function setBackground(spec) {
    var src = spec && spec.video;

    if (!src) {
      if (bg) { bg.remove(); bg = null; }
      document.body.classList.remove('has-bg');
      return;
    }
    if (bg && bg.dataset.src === src) return;   /* already running */
    if (bg) bg.remove();

    bg = el('div', 'bg');
    bg.dataset.src = src;
    bg.setAttribute('aria-hidden', 'true');

    var v = document.createElement('video');
    v.className = 'bg__video';
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.preload = 'auto';
    /* Fade it up only once there are frames to show, so the page never
       flashes an empty black rectangle. */
    v.addEventListener('loadeddata', function () { bg.classList.add('is-ready'); });

    bg.appendChild(v);
    bg.appendChild(el('span', 'bg__scrim'));
    document.body.insertBefore(bg, document.body.firstChild);
    document.body.classList.add('has-bg');

    var p = v.play();
    if (p && p.catch) p.catch(function () { /* a still frame is fine */ });
  }

  /* ==================================================================
     THE TITLE CARD
     Black, then a line of type in the middle of it, then a slow
     dissolve into the picture. The card is the slide's eyebrow at
     display size - the same words, given the screen.
     ================================================================== */
  function rollFilm(film, card, reel, count) {
    var rolled = false;
    var timers = [];

    function roll() {
      if (rolled) return;
      rolled = true;
      timers.forEach(clearTimeout);
      if (film) {
        film.classList.remove('is-carding');
        film.classList.add('is-rolling');
      }
      if (window.Music) window.Music.duck(true);
      reel.dispatchEvent(new CustomEvent('film:start'));
    }

    if (!film || !card) { roll(); return; }

    /* A forced reflow rather than requestAnimationFrame: rAF can be
       starved in a headless or background tab, and the card would then
       appear with no fade at all. */
    void film.offsetWidth;
    film.classList.add('is-carding');

    card.addEventListener('click', roll);

    var numeral = card.querySelector('.countdown__n');
    if (!count || !numeral || reduceMotion()) {
      /* No count, or the visitor asked for less motion: read the line,
         then go. */
      timers.push(setTimeout(roll, reduceMotion() ? 1100 : 2400));
      return;
    }

    /* Three, two, one, and the room arrives. 900ms a beat reads as
       seconds without making anyone wait a literal three of them. */
    var n = count;
    function beat() {
      if (n < 1) { roll(); return; }
      numeral.textContent = String(n);
      numeral.classList.remove('is-tick');
      void numeral.offsetWidth;
      numeral.classList.add('is-tick');
      n--;
      timers.push(setTimeout(beat, 900));
    }
    timers.push(setTimeout(beat, 700));
  }

  /* Confirm the pick, then hand over to the slide dissolve. Kept
     short because the fade that follows it is another 200ms, and the
     two together are what the visitor feels as the wait. */
  function commit(wrap, btn, done) {
    if (reduceMotion()) { done(); return; }
    wrap.classList.add('choices--committed');
    btn.classList.add('is-chosen');
    setTimeout(done, 120);
  }

  function reduceMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ==================================================================
     KEYBOARD
     A sorting funnel is a keyboard product: number keys pick, arrows
     move between plates, Enter commits, Backspace goes back.
     ================================================================== */

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) ||
      e.target.isContentEditable;

    if (e.key === 'Backspace' && !typing) { e.preventDefault(); goBack(); return; }
    if (typing) return;

    var plates = [].slice.call(document.querySelectorAll('.choices:not([hidden]) .choice:not(.choice--end)'));
    if (!plates.length) return;

    if (/^[1-9]$/.test(e.key)) {
      var pick = plates[Number(e.key) - 1];
      if (pick) { e.preventDefault(); pick.click(); }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var at = plates.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown'
        ? (at + 1) % plates.length
        : (at <= 0 ? plates.length - 1 : at - 1);
      plates[next].focus();
    }
  }

  function goBack() {
    if (Record.state.path.length > 1) window.history.back();
  }

  function endHere(btn, choice) {
    var wrap = btn.closest('.choices');
    var msg = el('div', 'done');
    msg.setAttribute('tabindex', '-1');
    msg.appendChild(el('h2', 'head', choice.endHeading || 'Noted.'));
    msg.appendChild(el('p', 'prose',
      choice.endText || 'Nothing else will arrive from us unless you ask for it.'));
    wrap.replaceWith(msg);
    msg.focus();

    if (choice.handoff !== false) {
      Record.handoff({ role: 'terminal' });
    }
  }

  /* ==================================================================
     VALIDATOR
     A hand-edited JSON file will eventually point somewhere that does
     not exist. This says so in the console at load, with names.
     ================================================================== */

  function validateFunnel(f) {
    var ids = Object.keys(f.slides);
    var problems = [];
    var reached = {};
    reached[f.meta.start] = true;

    ids.forEach(function (id) {
      var s = f.slides[id];
      var outs = (s.choices || []).map(function (c) { return c.to; });

      (s.blocks || []).forEach(function (b) {
        if (b.then) outs.push(b.then);
        if (b.advanceTo) outs.push(b.advanceTo);
        if (b.skip && b.skip.to) outs.push(b.skip.to);
        if (b.done && b.done.to) outs.push(b.done.to);
      });

      outs.forEach(function (to) {
        if (!to) return;
        reached[to] = true;
        if (!f.slides[to]) problems.push(id + ' points to "' + to + '", which does not exist');
      });

      var hasForm = (s.blocks || []).some(function (b) { return b.type === 'form'; });
      if (!outs.filter(Boolean).length && !(s.choices || []).length && !hasForm) {
        problems.push(id + ' is a dead end: no choices, no form, nowhere to go');
      }
    });

    /* "parked": true marks a slide that is written but deliberately
       not wired up yet. It should not be reported as an orphan. */
    var orphans = ids.filter(function (id) {
      return !reached[id] && !f.slides[id].parked;
    });

    if (problems.length || orphans.length) {
      console.group('%c[iDecide] funnel check', 'color:#9A5527;font-weight:600');
      problems.forEach(function (p) { console.warn(p); });
      if (orphans.length) console.warn('Unreachable: ' + orphans.join(', '));
      console.groupEnd();
    } else {
      console.log('%c[iDecide] funnel check passed - ' + ids.length + ' slides, no dead ends',
        'color:#4E6F66');
    }
  }

  /* ==================================================================
     DEBUG PAYLOAD DRAWER
     ================================================================== */

  function showPayload(body) {
    if (!debug.showBuildNotes && !DEBUG_ON) return;
    var old = document.querySelector('.payload');
    if (old) old.remove();

    var d = el('div', 'payload');
    d.appendChild(el('b', null, 'Payload held in the browser - no webhook set'));
    var close = el('button', null, 'Close');
    close.type = 'button';
    close.addEventListener('click', function () { d.remove(); });
    d.appendChild(close);
    var pre = el('pre', null, JSON.stringify(body, null, 2));
    d.appendChild(pre);
    document.body.appendChild(d);
  }

  /* ==================================================================
     BOOT
     ================================================================== */

  function boot(f) {
    funnel = f;

    if (f.theme) {
      Object.keys(f.theme).forEach(function (k) {
        document.documentElement.style.setProperty('--' + k, f.theme[k]);
      });
    }

    Record.init(f.meta.id);
    if (debug.validateOnLoad) validateFunnel(f);

    /* No rail, no step markers, no progress bar. The visitor is never
       shown where they are in the funnel - only one quiet way back,
       which stays faint until you go looking for it. */
    root = el('div', 'app');

    /* Slow light moving behind the dark screens. Two layers drifting
       at different rates so it never repeats visibly, and it is only
       painted while a dark slide is up. */
    var aurora = el('div', 'aurora');
    aurora.setAttribute('aria-hidden', 'true');
    aurora.appendChild(el('span', 'aurora__a'));
    aurora.appendChild(el('span', 'aurora__b'));

    back = el('button', 'back');
    back.type = 'button';
    back.hidden = true;
    back.setAttribute('aria-label', 'Back one step');
    back.title = 'Back  (Backspace)';
    back.innerHTML = '<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">' +
      '<path d="M9.5 2 4 7.5 9.5 13" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>';
    back.addEventListener('click', goBack);
    root.appendChild(back);

    root.appendChild(el('main', 'stage'));
    document.addEventListener('keydown', onKey);

    document.body.innerHTML = '';
    document.body.appendChild(aurora);
    document.body.appendChild(root);

    /* Music lives outside the stage so it survives every slide
       change; it must never restart when the page moves on. */
    if (window.Music) window.Music.mount(f.music);

    window.addEventListener('hashchange', function () {
      render(idFromHash() || f.meta.start);
    });

    /* Resuming a session lands on the last slide, not the welcome. */
    var startAt = idFromHash();
    if (!startAt) {
      var p = Record.state.path;
      startAt = p.length ? p[p.length - 1] : f.meta.start;
    }
    navigate(startAt);
    render(startAt);
  }

  function bootFailed(err) {
    var wrap = el('div', 'boot');
    wrap.appendChild(el('h1', null, 'The funnel did not load'));
    wrap.appendChild(B.paragraphs(
      'index.html loads data/funnel.js, which sets window.FUNNEL. Either that ' +
      'file is missing, or a hand edit left it with a syntax error.\n\n' + err
    ));
    wrap.appendChild(B.paragraphs(
      'Open the browser console for the line number, or run  node --check ' +
      'data/funnel.js  to find it.'
    ));
    document.body.innerHTML = '';
    document.body.appendChild(wrap);
  }

  window.IDecide = {
    record: Record,
    start: function () {
      /* data/funnel.js assigns window.FUNNEL with a plain <script> tag,
         which is what lets the whole thing run from a file:// URL. The
         fetch path stays as a fallback for anyone who would rather keep
         the funnel as a .json file and serve it over http. */
      if (window.FUNNEL) {
        try { boot(window.FUNNEL); }
        catch (err) { bootFailed(err.message || String(err)); }
        return;
      }
      if (!CFG.funnel) {
        bootFailed('No funnel found. data/funnel.js should set window.FUNNEL.');
        return;
      }
      fetch(CFG.funnel, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(boot)
        .catch(function (err) { bootFailed(err.message || String(err)); });
    }
  };

})(window, document);
