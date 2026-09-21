/* ==================================================================
   RWT-iDecide - block renderers

   Every slide in data/funnel.js is a list of blocks. This file is
   the whole vocabulary. Each renderer takes the block object and a
   context ({ record, navigate, debug }) and returns an HTMLElement.

   Adding a block type means adding one function to BLOCKS below and
   documenting it in README.md. Nothing else in the engine changes.
   ================================================================== */

(function (window, document) {
  'use strict';

  /* ---------- small helpers ------------------------------------- */

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Paragraph splitting on blank lines. Single newlines are kept as
     line breaks so address blocks and schedules survive intact. */
  function paragraphs(text, className) {
    var frag = document.createDocumentFragment();
    String(text).split(/\n\s*\n/).forEach(function (chunk) {
      var p = el('p', className);
      chunk.split('\n').forEach(function (line, i) {
        if (i) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
      });
      frag.appendChild(p);
    });
    return frag;
  }

  function money(n) {
    if (typeof n !== 'number') return String(n);
    return '$' + n.toLocaleString('en-US');
  }

  function slug(s) {
    return String(s).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  /* ==================================================================
     BLOCK: prose
     { "type":"prose", "text":"...", "lede":true }
     ================================================================== */
  function prose(b) {
    var wrap = document.createDocumentFragment();
    wrap.appendChild(paragraphs(b.text, 'prose' + (b.lede ? ' prose--lede' : '')));
    return wrap;
  }

  /* ==================================================================
     BLOCK: spec - a single line of hardware facts under a heading
     { "type":"spec", "text":"Four 27in screens - 1,200 sq in" }
     ================================================================== */
  function spec(b) {
    return el('p', 'spec', b.text);
  }

  /* ==================================================================
     BLOCK: aside - the bridge box. Volunteered information that costs
     the seller something. Patina rule, never a tinted card.
     { "type":"aside", "text":"..." }
     ================================================================== */
  function aside(b) {
    var n = el('div', 'aside');
    n.appendChild(paragraphs(b.text));
    return n;
  }

  /* ==================================================================
     BLOCK: video

     { "type":"video", "id":"V1", "seconds":22, "words":55,
       "script":"...", "src":"videos/v1.mp4", "poster":"...",
       "full":true, "hold":true, "advanceTo":"S2" }

     full       the frame fills the screen
     hold       the slide's choices stay hidden until this finishes
     advanceTo  go straight to that slide when it finishes

     No title, no duration, no production chrome - on the slide there
     is a picture and nothing else. It does not start itself: it waits
     for a 'film:start' event, which the engine sends once the title
     card has had its moment.

     Autoplay with sound is blocked by every browser until the visitor
     has interacted with the page, so the order is: try with sound,
     fall back to muted with an unmute control, and if even that is
     refused, show a play button. The first film on a cold visit will
     usually land on muted; every one after it plays with sound.
     ================================================================== */
  function video(b, ctx) {
    var reel = el('div', 'reel' + (b.full ? ' reel--full' : ''));
    var screen = el('div', 'reel__screen');
    screen.appendChild(el('div', 'reel__bloom'));
    var bar = el('div', 'reel__bar');

    var play = el('button', 'reel__play');
    play.type = 'button';
    play.hidden = true;
    play.setAttribute('aria-label', 'Play');
    play.innerHTML = '<svg width="22" height="26" viewBox="0 0 20 24" aria-hidden="true">' +
      '<path d="M1 1.5 19 12 1 22.5Z" fill="none" stroke="currentColor" ' +
      'stroke-width="1.3" stroke-linejoin="round"/></svg>';

    var unmute = el('button', 'reel__unmute', 'Sound on');
    unmute.type = 'button';
    unmute.hidden = true;

    var skip = el('button', 'reel__skip', 'Skip');
    skip.type = 'button';
    skip.hidden = true;

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      reel.classList.remove('reel--playing');
      skip.hidden = true;
      unmute.hidden = true;
      bar.style.width = '100%';
      if (b.advanceTo) { ctx.navigate(b.advanceTo); return; }
      /* The slide is listening for this and reveals its choices. */
      reel.dispatchEvent(new CustomEvent('film:end', { bubbles: true }));
    }

    if (b.src) {
      var v = document.createElement('video');
      v.src = b.src;
      v.playsInline = true;
      v.preload = 'auto';
      if (b.poster) v.poster = b.poster;
      screen.appendChild(v);

      v.addEventListener('timeupdate', function () {
        if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%';
      });
      v.addEventListener('ended', finish);

      play.addEventListener('click', function () { play.hidden = true; start(); });
      unmute.addEventListener('click', function () {
        v.muted = false;
        unmute.hidden = true;
      });

      function start() {
        reel.classList.add('reel--playing');
        skip.hidden = false;
        v.muted = false;
        var p = v.play();
        if (!p || !p.catch) return;
        p.catch(function () {
          v.muted = true;
          var p2 = v.play();
          if (p2 && p2.catch) {
            p2.catch(function () {
              /* Autoplay refused outright. Hand it back to the visitor. */
              reel.classList.remove('reel--playing');
              skip.hidden = true;
              play.hidden = false;
            });
          }
          unmute.hidden = false;
        });
      }
      reel.addEventListener('film:start', start, { once: true });

    } else {
      /* No footage yet. Run the stated duration so the prototype paces
         the way the finished funnel will. */
      var total = (b.seconds || 20) * 1000;
      var started = Date.now();
      var timer = null;

      function run() {
        reel.classList.add('reel--playing');
        skip.hidden = false;
        started = Date.now();
        timer = setInterval(function () {
          var pct = Math.min(1, (Date.now() - started) / total);
          bar.style.width = (pct * 100) + '%';
          if (pct >= 1) { clearInterval(timer); finish(); }
        }, 100);
      }
      reel.addEventListener('film:start', run, { once: true });
    }

    skip.addEventListener('click', finish);

    screen.appendChild(play);
    screen.appendChild(unmute);
    screen.appendChild(skip);
    reel.appendChild(screen);
    reel.appendChild(bar);

    /* The read-aloud script is production material, not visitor copy. */
    if (b.script && ctx.debug.showBuildNotes) {
      var s = el('div', 'reel__script');
      s.appendChild(el('b', null, (b.id || 'Video') + ' — ' +
        (b.seconds || '?') + 's, ' + (b.words || '?') + ' words'));
      s.appendChild(document.createTextNode(b.script));
      reel.appendChild(s);
    }
    return reel;
  }

  /* ==================================================================
     BLOCK: plan - the room drawn to its actual configuration.
     Sixteen displays in two opposing banks, one recliner between.
     { "type":"plan", "screens":16, "caption":"..." }
     ================================================================== */
  function plan(b) {
    /* Seen from above. Each screen is a panel edge-on, so a bank of them
       reads as a wall. Two walls facing each other, one chair between. */
    var count = b.screens || 16;
    var perSide = Math.ceil(count / 2);
    var W = 300, sw = 9, sh = 14, gapY = 3, padY = 8, inset = 46;
    var bankH = perSide * sh + (perSide - 1) * gapY;
    var floorH = bankH + 14;
    var H = padY + floorH + 32;
    var top = padY + 7;
    var cy = padY + floorH / 2;

    var parts = [];
    parts.push('<rect class="plan__floor" x="' + (inset - 20) + '" y="' + padY +
      '" width="' + (W - (inset - 20) * 2) + '" height="' + floorH + '" rx="3"/>');

    [inset, W - inset - sw].forEach(function (x0) {
      for (var i = 0; i < perSide; i++) {
        parts.push('<rect class="plan__screen" x="' + x0 +
          '" y="' + (top + i * (sh + gapY)) + '" width="' + sw +
          '" height="' + sh + '" rx="1"/>');
      }
    });

    /* One recliner, laid back, square to neither wall in particular. */
    var cx = W / 2;
    parts.push('<rect class="plan__chair" x="' + (cx - 19) + '" y="' + (cy - 27) +
      '" width="38" height="44" rx="13"/>');
    parts.push('<path class="plan__chair" d="M' + (cx - 15) + ' ' + (cy + 17) +
      ' q15 15 30 0"/>');
    H = padY + floorH + 6;   /* the caption sits outside the drawing now */

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'plan');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', b.caption ||
      ('Floor plan: ' + count + ' screens in two opposing banks around a single recliner.'));
    svg.innerHTML = parts.join('');

    /* The caption is HTML, not SVG text, so it keeps its size however
       small the drawing is scaled. */
    var frag = document.createDocumentFragment();
    frag.appendChild(svg);
    if (b.caption !== false) {
      frag.appendChild(el('p', 'plan__cap',
        b.caption || (count + ' screens facing each other, one chair')));
    }
    return frag;
  }

  /* ==================================================================
     BLOCK: plates - named image slots, so the client can see what
     photography each slide is waiting on.
     { "type":"plates", "items":["Empty recliner, low light", "..."] }
     ================================================================== */
  function plates(b) {
    var items = b.items || [];
    /* The first image leads at full width; any after it share a row
       beneath. Photography of a room like this is the argument, so it
       is shown big rather than as a thumbnail. */
    var wrap = el('div', 'media media--' + Math.min(items.length, 3));

    items.forEach(function (item, i) {
      var src = typeof item === 'string' ? null : item.src;
      var note = typeof item === 'string' ? item : item.note;
      var cell = el('figure', 'media__cell' + (i === 0 ? ' media__cell--lead' : ''));

      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = note || '';
        img.loading = 'lazy';
        cell.appendChild(img);
        /* A caption, not just alt text. These are renders and stills
           from other rooms, so saying what each one actually shows
           keeps a product page from implying more than it should. */
        if (note) cell.appendChild(el('figcaption', 'media__cap', note));
      } else {
        cell.classList.add('media__cell--empty');
        cell.appendChild(el('span', 'media__note', note));
      }
      wrap.appendChild(cell);
    });
    return wrap;
  }

  /* ==================================================================
     BLOCK: logo - the mark, at a size a mark should be.
     { "type":"logo", "src":"assets/media/rwt-lounge.png", "alt":"...",
       "wide":true }   // wide: a full lockup rather than a badge
     ================================================================== */
  function logo(b) {
    var img = document.createElement('img');
    /* A round badge and a full lockup want very different widths. */
    img.className = 'logo' + (b.wide ? ' logo--wide' : '');
    img.src = b.src;
    img.alt = b.alt || '';
    if (b.width) img.style.maxWidth = b.width;
    return img;
  }

  /* ==================================================================
     BLOCK: tiles - the focus menu. Each tap is recorded as a tag, so
     the booking desk knows how to open the call.
     { "type":"tiles", "tagPrefix":"FOCUS",
       "items":[{"name":"Emotional","lede":"...","lines":["...","..."]}],
       "after":"Plus 100+ more focuses in the full library." }
     ================================================================== */
  function tiles(b, ctx) {
    var frag = document.createDocumentFragment();
    var grid = el('div', 'tiles');
    var prefix = b.tagPrefix || 'FOCUS';

    (b.items || []).forEach(function (t) {
      var tag = prefix + '_' + slug(t.name);
      var btn = el('button', 'tile');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', ctx.record.hasTag(tag) ? 'true' : 'false');

      btn.appendChild(el('span', 'tile__name', t.name));
      if (t.lede) btn.appendChild(el('span', 'tile__lede', t.lede));
      if (t.lines && t.lines.length) {
        var list = el('span', 'tile__list');
        t.lines.forEach(function (line, i) {
          if (i) list.appendChild(document.createElement('br'));
          list.appendChild(document.createTextNode(line));
        });
        btn.appendChild(list);
      }

      btn.addEventListener('click', function () {
        var on = ctx.record.toggleTag(tag);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      grid.appendChild(btn);
    });

    frag.appendChild(grid);
    if (b.after) frag.appendChild(el('p', 'tiles__after', b.after));
    return frag;
  }

  /* ==================================================================
     BLOCK: panels - mechanism and objections, always behind a click.
     { "type":"panels", "items":[{"q":"...","a":"..."}] }
     ================================================================== */
  function panels(b, ctx) {
    var wrap = el('div', 'panels');
    (b.items || []).forEach(function (item) {
      var d = el('details', 'panel');
      var s = el('summary');
      s.appendChild(el('span', null, item.q));
      d.appendChild(s);
      var body = el('div', 'panel__body');
      body.appendChild(paragraphs(item.a));
      d.appendChild(body);
      /* Opening a panel says what someone is worried about. Worth knowing. */
      d.addEventListener('toggle', function () {
        if (d.open) ctx.record.note('opened', item.q);
      });
      wrap.appendChild(d);
    });
    return wrap;
  }

  /* ==================================================================
     BLOCK: ladder - price options. Selecting one records the offer
     and pre-fills the capture form downstream.
     { "type":"ladder", "items":[
         {"id":"pack-3","name":"3-Hour Pack","price":157,
          "unit":"$52 an hour","note":"Most people start here","default":true}]}
     ================================================================== */
  function ladder(b, ctx) {
    var wrap = el('div', 'ladder');
    wrap.setAttribute('role', 'group');
    if (b.label) wrap.setAttribute('aria-label', b.label);
    var buttons = [];

    (b.items || []).forEach(function (item) {
      var btn = el('button', 'rung');
      btn.type = 'button';
      var chosen = ctx.record.state.offer && ctx.record.state.offer.id === item.id;
      btn.setAttribute('aria-pressed', chosen ? 'true' : 'false');

      btn.appendChild(el('span', 'rung__mark'));
      btn.appendChild(el('span', 'rung__name', item.name));
      var p = el('span', 'rung__price');
      p.appendChild(document.createTextNode(money(item.price)));
      /* "a month" belongs next to the number, not in the fine print -
         a recurring price read as one-off is the costliest misread here. */
      if (item.period) p.appendChild(el('small', null, ' ' + item.period));
      btn.appendChild(p);
      if (item.note) btn.appendChild(el('span', 'rung__note', item.note));
      if (item.unit) btn.appendChild(el('span', 'rung__unit', item.unit));

      btn.addEventListener('click', function () {
        ctx.record.setOffer({ id: item.id, name: item.name, price: item.price, period: item.period || null });
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
      });

      buttons.push(btn);
      wrap.appendChild(btn);
    });

    /* Pre-select the default, but only if nothing is chosen yet. */
    if (!ctx.record.state.offer) {
      var d = (b.items || []).filter(function (i) { return i.default; })[0];
      if (d) {
        ctx.record.setOffer({ id: d.id, name: d.name, price: d.price, period: d.period || null });
        buttons[(b.items || []).indexOf(d)].setAttribute('aria-pressed', 'true');
      }
    }
    return wrap;
  }

  /* ==================================================================
     BLOCK: summary - what the visitor has picked so far, in their own
     terms, shown just above a capture form so nobody submits wondering
     what they just agreed to.
     { "type":"summary", "empty":"Nothing selected yet." }
     ================================================================== */
  function summary(b, ctx) {
    var s = ctx.record.state;
    var lines = [];

    if (s.offer) {
      lines.push(s.offer.name + ', ' + money(s.offer.price) +
        (s.offer.period ? ' ' + s.offer.period : ''));
    }
    if (s.fields.system) lines.push(s.fields.system + ' system');
    if (s.fields.paymentPath) lines.push(s.fields.paymentPath);

    var focuses = s.tags.filter(function (t) { return t.indexOf('FOCUS_') === 0; })
      .map(function (t) {
        var w = t.slice(6).toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1);
      });
    if (focuses.length) lines.push('Focus: ' + focuses.join(', '));

    if (!lines.length) {
      return b.empty ? el('p', 'spec', b.empty) : document.createComment(' nothing selected ');
    }

    var n = el('div', 'summary');
    n.appendChild(el('p', 'summary__label', b.label || 'What you picked'));
    var ul = el('ul', 'summary__list');
    lines.forEach(function (line) { ul.appendChild(el('li', null, line)); });
    n.appendChild(ul);
    return n;
  }

  /* ==================================================================
     BLOCK: price - one headline price with its strike-through.
     { "type":"price", "was":"MSRP $49,997", "now":"$26,999", "sub":"..." }
     ================================================================== */
  function price(b) {
    var n = el('div', 'price');
    if (b.was) n.appendChild(el('div', 'price__was', b.was));
    n.appendChild(el('div', 'price__now', b.now));
    if (b.sub) n.appendChild(el('div', 'price__sub', b.sub));
    return n;
  }

  /* ==================================================================
     BLOCK: counter - real scarcity, edited by hand in the JSON.
     Never reset it. Reset it once and this lead type is gone.
     { "type":"counter", "remaining":11, "total":32, "label":"..." }
     ================================================================== */
  function counter(b) {
    var n = el('div', 'counter');
    var big = el('div', 'counter__n');
    big.appendChild(document.createTextNode(String(b.remaining)));
    if (b.total) {
      var s = el('small', null, ' of ' + b.total);
      big.appendChild(s);
    }
    n.appendChild(big);
    if (b.label) n.appendChild(el('p', 'counter__label', b.label));
    return n;
  }

  /* ==================================================================
     BLOCK: compare
     { "type":"compare", "columns":["","Advanced","Elite","Elite II"],
       "rows":[["Screens","Four 27in","Four 32in","Eight 32in"]] }
     ================================================================== */
  function compare(b) {
    var wrap = el('div', 'compare-wrap');
    var table = el('table', 'compare');
    if (b.caption) {
      var cap = el('caption', null, b.caption);
      cap.style.captionSide = 'bottom';
      cap.style.textAlign = 'left';
      cap.style.paddingTop = '.7rem';
      cap.style.color = 'var(--ink-soft)';
      cap.style.fontSize = '.8125rem';
      table.appendChild(cap);
    }
    var thead = el('thead');
    var hr = el('tr');
    (b.columns || []).forEach(function (c) {
      var th = el('th', null, c);
      th.scope = 'col';
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    (b.rows || []).forEach(function (row) {
      var tr = el('tr');
      row.forEach(function (cell, i) {
        var td = i === 0 ? el('th', null, cell) : el('td', null, cell);
        if (i === 0) td.scope = 'row';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  /* ==================================================================
     BLOCK: form - identity capture and the closing forms.
     { "type":"form", "role":"identity"|"capture",
       "fields":[{"name":"firstName","label":"First name","required":true},
                 {"name":"system","label":"Which system?","type":"select",
                  "options":["Advanced","Elite","Elite II","Not sure yet"]}],
       "consent":"Yes, contact me by phone, text and email...",
       "consentRequired":true,
       "submit":"Confirm my spot",
       "skip":{"label":"Look around first","to":"S1"},
       "then":"S1" | null,
       "done":{"heading":"You're in.","text":"..."} }

     role:"identity"  - names the visitor, does not end the funnel.
     role:"capture"   - assembles the whole payload and hands it off.
     ================================================================== */
  function form(b, ctx) {
    var f = el('form', 'form');
    f.noValidate = true;

    /* A titled form reads as a sign-in panel rather than a stray pair
       of fields at the bottom of a page. */
    if (b.title) f.appendChild(el('p', 'form__title', b.title));
    if (b.intro) f.appendChild(el('p', 'form__intro', b.intro));

    var grid = el('div', 'form__grid');
    var inputs = {};

    (b.fields || []).forEach(function (spec) {
      var field = el('div', 'field' + (spec.full ? ' field--full' : ''));
      var id = 'f_' + spec.name + '_' + Math.random().toString(36).slice(2, 7);

      var label = el('label', null, spec.label + (spec.required ? '' : ' (optional)'));
      label.htmlFor = id;
      field.appendChild(label);

      var input;
      if (spec.type === 'select') {
        input = el('select');
        (spec.options || []).forEach(function (o) {
          input.appendChild(el('option', null, o));
        });
      } else {
        input = el('input');
        input.type = spec.type || 'text';
        if (spec.placeholder) input.placeholder = spec.placeholder;
        if (spec.type === 'email') input.autocomplete = 'email';
        if (spec.name === 'firstName') input.autocomplete = 'given-name';
        if (spec.name === 'lastName') input.autocomplete = 'family-name';
        if (spec.type === 'tel') input.autocomplete = 'tel';
      }
      input.id = id;
      input.name = spec.name;
      if (spec.required) input.required = true;

      /* Carry anything we already know about this person forward. */
      var known = ctx.record.known(spec.name);
      if (known) input.value = known;

      var err = el('p', 'field__error');
      err.hidden = true;
      err.id = id + '_err';
      input.setAttribute('aria-describedby', err.id);

      field.appendChild(input);
      field.appendChild(err);
      grid.appendChild(field);
      inputs[spec.name] = { input: input, field: field, err: err, spec: spec };
    });

    f.appendChild(grid);

    /* Consent is never pre-checked. */
    var consentBox = null;
    if (b.consent) {
      var lab = el('label', 'consent');
      consentBox = el('input');
      consentBox.type = 'checkbox';
      consentBox.checked = false;
      lab.appendChild(consentBox);
      lab.appendChild(el('span', null, b.consent));
      f.appendChild(lab);
    }

    var status = el('p', 'form__status');
    status.hidden = true;
    status.setAttribute('role', 'status');

    var row = el('div', 'form__submit');
    var submit = el('button', 'btn', b.submit || 'Continue');
    submit.type = 'submit';
    row.appendChild(submit);

    if (b.skip) {
      var skip = el('button', 'btn btn--quiet', b.skip.label);
      skip.type = 'button';
      skip.addEventListener('click', function () {
        ctx.record.note('skipped', b.role || 'form');
        ctx.navigate(b.skip.to);
      });
      row.appendChild(skip);
    }
    f.appendChild(row);
    f.appendChild(status);
    if (b.footnote) f.appendChild(el('p', 'form__footnote', b.footnote));

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {};
      var firstBad = null;

      Object.keys(inputs).forEach(function (name) {
        var o = inputs[name];
        var v = o.input.value.trim();
        values[name] = v;
        var problem = validate(v, o.spec);
        o.field.classList.toggle('field--error', !!problem);
        o.err.textContent = problem || '';
        o.err.hidden = !problem;
        if (problem && !firstBad) firstBad = o.input;
      });

      if (b.consentRequired && consentBox && !consentBox.checked) {
        status.textContent = 'Tick the box above so we know we may contact you.';
        status.hidden = false;
        if (!firstBad) firstBad = consentBox;
      } else if (!firstBad) {
        status.hidden = true;
      }

      if (firstBad) { firstBad.focus(); return; }

      if (consentBox) values.consent = consentBox.checked;
      ctx.record.fill(values);

      if (b.role === 'capture') {
        submit.disabled = true;
        submit.dataset.busy = '1';
        submit.textContent = 'Sending';
        ctx.record.handoff(b).then(function (result) {
          if (result.ok) {
            f.replaceWith(confirmation(b.done, ctx));
          } else {
            submit.disabled = false;
            delete submit.dataset.busy;
            submit.textContent = b.submit || 'Continue';
            status.textContent = result.message;
            status.hidden = false;
          }
        });
      } else {
        ctx.navigate(b.then);
      }
    });

    return f;
  }

  function validate(value, spec) {
    if (spec.required && !value) return 'We need this one.';
    if (!value) return null;
    if (spec.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'That address is missing something.';
    }
    if (spec.type === 'tel' && value.replace(/\D/g, '').length < 10) {
      return 'A ten-digit number, please.';
    }
    return null;
  }

  function confirmation(done, ctx) {
    var n = el('div', 'done');
    n.setAttribute('tabindex', '-1');
    n.appendChild(el('h2', 'head', (done && done.heading) || 'You are in.'));
    if (done && done.text) n.appendChild(paragraphs(done.text, 'prose'));
    if (done && done.to) {
      var b = el('button', 'btn', done.toLabel || 'Continue');
      b.type = 'button';
      b.style.marginTop = '1.5rem';
      b.addEventListener('click', function () { ctx.navigate(done.to); });
      n.appendChild(b);
    }
    setTimeout(function () { n.focus(); }, 40);
    return n;
  }

  /* ================================================================== */

  var BLOCKS = {
    prose: prose,
    spec: spec,
    aside: aside,
    video: video,
    plan: plan,
    plates: plates,
    logo: logo,
    tiles: tiles,
    panels: panels,
    ladder: ladder,
    price: price,
    summary: summary,
    counter: counter,
    compare: compare,
    form: form
  };

  window.IDecideBlocks = {
    types: BLOCKS,
    render: function (block, ctx) {
      var fn = BLOCKS[block.type];
      if (!fn) {
        console.warn('[iDecide] unknown block type: ' + block.type);
        return document.createComment(' unknown block: ' + block.type + ' ');
      }
      return fn(block, ctx);
    },
    el: el,
    paragraphs: paragraphs
  };

})(window, document);
