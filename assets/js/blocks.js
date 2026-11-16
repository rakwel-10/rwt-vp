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

  /* Two markers, used anywhere copy is set from funnel.js:
       **ink bold**   -> <strong>, the existing plain emphasis
       _copper bold_  -> <span class="accent">, the one color accent
     A string with neither marker comes back as a single text node,
     so dynamic re-fills (choice labels with a {token}) still work by
     reassigning that node's value - see engine.js's Record.onChange. */
  function richText(text) {
    var frag = document.createDocumentFragment();
    var s = String(text);
    var re = /\*\*([^*]+)\*\*|_([^_]+)_/g;
    var last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[1] != null) frag.appendChild(el('strong', null, m[1]));
      else frag.appendChild(el('span', 'accent', m[2]));
      last = re.lastIndex;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    return frag;
  }

  /* Paragraph splitting on blank lines. Single newlines are kept as
     line breaks so address blocks and schedules survive intact. */
  function paragraphs(text, className) {
    var frag = document.createDocumentFragment();
    String(text).split(/\n\s*\n/).forEach(function (chunk) {
      var p = el('p', className);
      chunk.split('\n').forEach(function (line, i) {
        if (i) p.appendChild(document.createElement('br'));
        p.appendChild(richText(line));
      });
      frag.appendChild(p);
    });
    return frag;
  }

  /* The same two markers, stripped rather than rendered - for the
     record (and anything sent on to GoHighLevel), which wants the
     words a visitor picked, not the markup that colored them. */
  function plainText(text) {
    return String(text).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/_([^_]+)_/g, '$1');
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
    /* "style":"title" is a heading inside the column, not a paragraph */
    if (b.style === 'title') {
      var h = el('h3', 'prose prose--title');
      h.appendChild(richText(b.text));
      return h;
    }
    var wrap = document.createDocumentFragment();
    wrap.appendChild(paragraphs(b.text, 'prose' + (b.lede ? ' prose--lede' : '') +
      (b.style ? ' prose--' + b.style : '')));
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
     has interacted with the page, so it only ever tries the one way:
     with sound. If that is refused, it hands back a play button
     rather than falling back to a silent autoplay - the film only
     ever starts itself when it can do so with sound, and otherwise
     waits for the click that guarantees it.
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

    var skip = el('button', 'reel__skip', 'Skip');
    skip.type = 'button';
    skip.hidden = true;

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      reel.classList.remove('reel--playing');
      skip.hidden = true;
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

      /* ---------- controls ---------------------------------------
         Real controls, but not the browser's: a native bar drops a
         grey Chrome widget into a copper room. These keep out of the
         way while the film runs and come back on hover, on keyboard
         focus, or any time it is paused.
         ----------------------------------------------------------- */
      var controls = el('div', 'rc');
      controls.hidden = true;

      var toggle = el('button', 'rc__btn rc__toggle');
      toggle.type = 'button';

      var seek = document.createElement('input');
      seek.className = 'rc__seek';
      seek.type = 'range';
      seek.min = 0; seek.max = 1000; seek.step = 1; seek.value = 0;
      seek.setAttribute('aria-label', 'Seek');

      var time = el('span', 'rc__time', '0:00 / 0:00');

      var mute = el('button', 'rc__btn rc__mute');
      mute.type = 'button';

      var full = el('button', 'rc__btn rc__full');
      full.type = 'button';
      full.setAttribute('aria-label', 'Full screen');

      controls.appendChild(toggle);
      controls.appendChild(seek);
      controls.appendChild(time);
      controls.appendChild(mute);
      controls.appendChild(full);

      var ICON = {
        play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8 4 13.5Z" fill="currentColor"/></svg>',
        pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="2.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="9" y="2.5" width="3" height="11" rx="1" fill="currentColor"/></svg>',
        loud: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.6L8.6 3v10L5.1 10H2.5Z" fill="currentColor"/><path d="M10.8 6.2a2.6 2.6 0 0 1 0 3.6M12.6 4.4a5.2 5.2 0 0 1 0 7.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        quiet: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.6L8.6 3v10L5.1 10H2.5Z" fill="currentColor"/><path d="M11 6.4l3.4 3.4M14.4 6.4L11 9.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        expand: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2H2v4M10 2h4v4M10 14h4v-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        shrink: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h4V2M14 6h-4V2M14 10h-4v4M2 10h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      };

      function clock(s) {
        if (!isFinite(s) || s < 0) s = 0;
        var m = Math.floor(s / 60);
        var r = Math.floor(s % 60);
        return m + ':' + (r < 10 ? '0' : '') + r;
      }

      function paintToggle() {
        var paused = v.paused;
        toggle.innerHTML = paused ? ICON.play : ICON.pause;
        toggle.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        /* Paused pins the controls open, so they are never hidden
           behind a hover the visitor has to guess at. */
        reel.classList.toggle('is-paused', paused && !finished);
      }

      function paintMute() {
        mute.innerHTML = v.muted ? ICON.quiet : ICON.loud;
        mute.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
      }

      paintToggle();
      paintMute();
      full.innerHTML = ICON.expand;

      toggle.addEventListener('click', function () {
        if (v.paused) v.play().catch(function () {}); else v.pause();
      });

      mute.addEventListener('click', function () {
        v.muted = !v.muted;
      });

      full.addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (screen.requestFullscreen) screen.requestFullscreen().catch(function () {});
      });

      document.addEventListener('fullscreenchange', function () {
        var on = document.fullscreenElement === screen;
        full.innerHTML = on ? ICON.shrink : ICON.expand;
        full.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen');
      });

      /* A drag on the scrubber must not fight the timeupdate that is
         also trying to move it. */
      var scrubbing = false;
      seek.addEventListener('pointerdown', function () { scrubbing = true; });
      seek.addEventListener('input', function () {
        if (!v.duration) return;
        v.currentTime = (seek.value / 1000) * v.duration;
        bar.style.width = (seek.value / 10) + '%';
        time.textContent = clock(v.currentTime) + ' / ' + clock(v.duration);
      });
      function stopScrub() { scrubbing = false; }
      seek.addEventListener('pointerup', stopScrub);
      seek.addEventListener('change', stopScrub);
      window.addEventListener('pointerup', stopScrub);

      v.addEventListener('play', paintToggle);
      v.addEventListener('pause', paintToggle);
      v.addEventListener('volumechange', paintMute);
      v.addEventListener('loadedmetadata', function () {
        time.textContent = clock(0) + ' / ' + clock(v.duration);
      });

      v.addEventListener('timeupdate', function () {
        if (!v.duration) return;
        var pct = v.currentTime / v.duration;
        bar.style.width = (pct * 100) + '%';
        if (!scrubbing) seek.value = Math.round(pct * 1000);
        time.textContent = clock(v.currentTime) + ' / ' + clock(v.duration);
      });

      v.addEventListener('ended', function () {
        reel.classList.remove('is-paused');
        finish();
      });

      play.addEventListener('click', function () { play.hidden = true; start(); });

      function start() {
        /* never from a slide that is no longer on screen */
        if (!v.isConnected) return;
        reel.classList.add('reel--playing');
        skip.hidden = false;
        controls.hidden = false;
        v.muted = false;
        var p = v.play();
        if (!p || !p.catch) return;
        p.catch(function () {
          /* Autoplay with sound refused. Hand it back to the visitor
             rather than starting it silently. */
          reel.classList.remove('reel--playing');
          skip.hidden = true;
          play.hidden = false;
          paintToggle();
        });
      }

      reel.addEventListener('film:start', start, { once: true });
      screen.appendChild(controls);

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

    /* Skip means "take me on": the film stops and the slide moves to
       its next part, the same as pressing its main button. The slide
       does that (it knows where "next" is) by cancelling the event;
       a film with nowhere to go just ends where it is instead. */
    skip.addEventListener('click', function () {
      var vid = reel.querySelector('video');
      if (vid) vid.pause();
      var e = new CustomEvent('film:skip', { bubbles: true, cancelable: true });
      if (reel.dispatchEvent(e)) finish();
      else { finished = true; skip.hidden = true; }
    });

    screen.appendChild(play);
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
      /* "whole": a finished graphic with its own text in it (the system
         banners). Shown at its own shape, never cropped to the frame. */
      var whole = typeof item === 'object' && item.whole;
      var cell = el('figure', 'media__cell' + (i === 0 ? ' media__cell--lead' : '') +
        (whole ? ' media__cell--whole' : ''));

      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = (typeof item === 'object' && item.alt) || note || '';
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
    var screen = b.screen ? focusScreen(b, ctx, prefix) : null;
    if (screen) frag.appendChild(screen.node);

    (b.items || []).forEach(function (t) {
      var tag = prefix + '_' + slug(t.name);
      var btn = el('button', 'tile');
      btn.type = 'button';
      btn.dataset.tag = tag;
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
        /* a drag that just ended is not also a click */
        if (btn.dataset.dragged) { delete btn.dataset.dragged; return; }
        var on = ctx.record.toggleTag(tag);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (screen) screen.changed(on ? { tag: tag, name: t.name, from: btn } : null);
      });
      if (screen) screen.draggable(btn, tag, t.name);
      grid.appendChild(btn);
    });

    if (screen) {
      /* the cards on the left, the screen beside them on the right */
      var board = el('div', 'fboard');
      board.appendChild(grid);
      board.appendChild(screen.node);
      frag.appendChild(board);
    } else {
      frag.appendChild(grid);
    }
    if (b.after) frag.appendChild(el('p', 'tiles__after', b.after));
    if (screen) screen.sync(grid);
    return frag;
  }

  /* ------------------------------------------------------------------
     The focus screen. A picture of the device, running its own footage:
     drag a focus card onto it (or tap the card) and it lands there. The
     screen sits paused and dim while it is empty, comes alive with the
     first focus, and runs a little livelier with each one after. A
     picked card stays highlighted; tapping it again takes it off.
     It only ever reads and writes the same FOCUS_ tags the cards do.
     { "screen": { "video": ["a.webm","a.mp4"], "poster": "a.jpg" } }
     ------------------------------------------------------------------ */
  function focusScreen(b, ctx, prefix) {
    var spec = b.screen;
    var names = {};
    (b.items || []).forEach(function (t) { names[prefix + '_' + slug(t.name)] = t.name; });

    var node = el('div', 'fscreen');
    var stage = el('div', 'fscreen__stage');
    var v = document.createElement('video');
    v.className = 'fscreen__video';
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    if (spec.poster) v.poster = spec.poster;
    [].concat(spec.video || []).forEach(function (src) {
      var s = document.createElement('source');
      s.src = src;
      s.type = /\.webm$/i.test(src) ? 'video/webm' : 'video/mp4';
      v.appendChild(s);
    });
    stage.appendChild(v);
    var drop = el('span', 'fscreen__drop', 'Drop a focus here');
    drop.setAttribute('aria-hidden', 'true');
    stage.appendChild(drop);

    node.appendChild(stage);

    function chosen() {
      return Object.keys(names).filter(function (tag) { return ctx.record.hasTag(tag); });
    }

    /* paint the screen from the record */
    function paint(pulse) {
      var on = chosen();
      node.dataset.count = on.length;
      node.classList.toggle('is-live', on.length > 0);

      if (on.length) {
        /* a little livelier with each focus, never frantic */
        v.playbackRate = Math.min(1.6, 1 + 0.12 * (on.length - 1));
        if (v.paused && v.isConnected) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { /* still frame is fine */ });
        }
      } else if (!v.paused) {
        v.pause();
      }

      if (pulse && !reduced()) {
        node.classList.remove('is-pulse');
        void node.offsetWidth;
        node.classList.add('is-pulse');
      }
    }

    /* A card "goes to the screen": a copy of its name flies from the
       card into the middle of the screen, then the screen takes it. */
    function fly(name, fromRect) {
      if (reduced() || !fromRect) return;
      var to = stage.getBoundingClientRect();
      var ghost = el('span', 'fghost', name);
      document.body.appendChild(ghost);
      var gw = ghost.offsetWidth, gh = ghost.offsetHeight;
      var x0 = fromRect.left + fromRect.width / 2 - gw / 2;
      var y0 = fromRect.top + fromRect.height / 2 - gh / 2;
      var x1 = to.left + to.width / 2 - gw / 2;
      var y1 = to.top + to.height * 0.45 - gh / 2;
      ghost.style.transform = 'translate(' + x0 + 'px,' + y0 + 'px)';
      void ghost.offsetWidth;
      ghost.classList.add('is-flying');
      ghost.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px) scale(.85)';
      setTimeout(function () { ghost.classList.add('is-landed'); }, 520);
      setTimeout(function () { ghost.remove(); }, 900);
    }

    /* Drag with a mouse or pen. On a touchscreen a card is tapped, not
       dragged: a drag there would fight the page's own scrolling. */
    function draggable(btn, tag, name) {
      btn.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch' || e.button !== 0) return;
        var sx = e.clientX, sy = e.clientY, ghost = null, over = false;

        function move(ev) {
          if (!ghost) {
            if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 8) return;
            ghost = el('span', 'fghost fghost--drag', name);
            document.body.appendChild(ghost);
            btn.classList.add('is-dragging');
            node.classList.add('is-awaiting');
          }
          ghost.style.transform = 'translate(' + (ev.clientX - ghost.offsetWidth / 2) + 'px,' +
            (ev.clientY - ghost.offsetHeight / 2) + 'px)';
          var r = stage.getBoundingClientRect();
          over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
          node.classList.toggle('is-over', over);
        }
        function up() {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (!ghost) return;                        /* a plain click */
          btn.dataset.dragged = '1';                 /* swallow the click that follows */
          setTimeout(function () { delete btn.dataset.dragged; }, 0);
          ghost.remove();
          btn.classList.remove('is-dragging');
          node.classList.remove('is-awaiting', 'is-over');
          if (over && !ctx.record.hasTag(tag)) {
            ctx.record.toggleTag(tag);
            btn.setAttribute('aria-pressed', 'true');
            ctx.record.note('dropped', name);
            paint(true);
          }
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    }

    return {
      node: node,
      draggable: draggable,
      /* painted once now, and again once the slide is on the page -
         a video can only start playing after it is in the document */
      sync: function () { paint(); setTimeout(function () { paint(); }, 60); },
      changed: function (added) {
        if (added) fly(added.name, added.from.getBoundingClientRect());
        paint(!!added);
      }
    };
  }

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  /* Laid out as a comparison table: one column per option, side by
     side, with the row labels ("rowLabels": price, unit, note rows)
     down the left, and a whole column is the click target. Each rung
     is still a single button, so selection and keyboard use are
     unchanged; on a phone the columns fall back to stacked cards. */
  function ladder(b, ctx) {
    var wrap = el('div', 'ladder ladder--table');
    wrap.setAttribute('role', 'group');
    if (b.label) wrap.setAttribute('aria-label', b.label);
    wrap.style.setProperty('--cols', (b.items || []).length);
    var buttons = [];

    var labels = b.rowLabels || ['Price', '', ''];
    var side = el('div', 'ladder__labels');
    side.setAttribute('aria-hidden', 'true');
    side.appendChild(el('span', 'ladder__label ladder__label--head'));
    labels.forEach(function (t) { side.appendChild(el('span', 'ladder__label', t)); });
    wrap.appendChild(side);

    (b.items || []).forEach(function (item) {
      var btn = el('button', 'rung');
      btn.type = 'button';
      var chosen = ctx.record.state.offer && ctx.record.state.offer.id === item.id;
      btn.setAttribute('aria-pressed', chosen ? 'true' : 'false');

      var head = el('span', 'rung__head');
      head.appendChild(el('span', 'rung__mark'));
      head.appendChild(el('span', 'rung__name', item.name));
      btn.appendChild(head);
      var p = el('span', 'rung__price');
      p.appendChild(document.createTextNode(money(item.price)));
      /* "a month" belongs next to the number, not in the fine print -
         a recurring price read as one-off is the costliest misread here. */
      if (item.period) p.appendChild(el('small', null, ' ' + item.period));
      btn.appendChild(p);
      /* every column fills every row, so the table never goes ragged */
      btn.appendChild(el('span', 'rung__unit', item.unit || ''));
      btn.appendChild(el('span', 'rung__note', item.note || ''));

      btn.addEventListener('click', function () {
        ctx.record.setOffer({ id: item.id, name: item.name, price: item.price, period: item.period || null });
        buttons.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
      });

      buttons.push(btn);
      wrap.appendChild(btn);
    });

    /* Pre-select the default unless something on this ladder is
       already chosen. A pick from a different ladder (a membership,
       when this is the hour packs) does not count - otherwise the CTA
       here would name, and check out, a product this page never showed. */
    var current = ctx.record.state.offer;
    var onThisLadder = current && (b.items || []).some(function (i) { return i.id === current.id; });
    if (!onThisLadder) {
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
     { "type":"compare", "columns":["","Advance","Elite","Elite 2"],
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
                  "options":["Not sure yet","Elite","Elite 2","Advance"]}],
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
    var f = el('form', 'form' + (b.panel ? ' form--panel' : ''));
    f.noValidate = true;

    /* A titled form reads as a sign-in panel rather than a stray pair
       of fields at the bottom of a page. As a panel the title is a
       real heading under the slide's own. */
    if (b.title) f.appendChild(el(b.panel ? 'h3' : 'p', 'form__title', b.title));
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
        if (spec.type === 'tel') { input.autocomplete = 'tel'; input.inputMode = 'tel'; }
        if (spec.type === 'email') input.inputMode = 'email';
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
    var submit = el('button', 'btn' + (b.panel ? ' btn--block' : ''), b.submit || 'Continue');
    submit.type = 'submit';
    if (b.panel) submit.appendChild(arrowMark(true));
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
          if (result.ok && b.done && b.done.slide) {
            ctx.markDone(ctx.slideId);
            ctx.navigate(b.done.slide);
          } else if (result.ok) {
            f.replaceWith(confirmation(b.done, ctx));
          } else {
            submit.disabled = false;
            delete submit.dataset.busy;
            submit.textContent = b.submit || 'Continue';
            if (b.panel) submit.appendChild(arrowMark(true));
            status.textContent = result.message;
            status.hidden = false;
          }
        });
      } else {
        if (b.role === 'identity') ctx.register();
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

  /* ---------- embedded GHL form ----------------------------------
     A form built and hosted in GoHighLevel, dropped into the funnel
     as an iframe. The visitor's name/email never reach our own
     record - GHL has already captured the lead by the time the
     iframe tells us submission happened, which is the whole point:
     the lead exists in the CRM even if they close the tab a second
     later. That trade means {firstName} personalisation further
     into the funnel falls back to its default ("there") here,
     since this.record never learns a name.

     GHL's form_embed.js does not publish a documented postMessage
     contract; the "set-sticky-contacts" match below comes from
     reading that script, so recheck it if GHL changes the embed.
     Every message from the
     form's iframe is logged to the console so a real submission
     can be checked against it. The dependable path is the form's
     own "redirect after submit" setting pointed at this funnel's
     #/S1 - engine.js handles that landing inside the iframe. */
  var ghlScriptsLoaded = {};

  function loadGhlScript(src) {
    if (!src || ghlScriptsLoaded[src]) return;
    ghlScriptsLoaded[src] = true;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.body.appendChild(s);
  }

  function ghlForm(b, ctx) {
    var wrap = el('div', 'form ghl-embed');
    if (b.title) wrap.appendChild(el('p', 'form__title', b.title));
    if (b.intro) wrap.appendChild(el('p', 'form__intro', b.intro));

    var frameWrap = el('div', 'ghl-embed__frame');
    var iframe = document.createElement('iframe');
    iframe.src = b.src;
    iframe.id = 'inline-' + b.formId;
    iframe.title = b.formName || 'Embedded form';
    iframe.style.height = (b.height || 432) + 'px';
    iframe.setAttribute('data-layout', "{'id':'INLINE'}");
    iframe.setAttribute('data-trigger-type', 'alwaysShow');
    iframe.setAttribute('data-trigger-value', '');
    iframe.setAttribute('data-activation-type', 'alwaysActivated');
    iframe.setAttribute('data-activation-value', '');
    iframe.setAttribute('data-deactivation-type', 'neverDeactivate');
    iframe.setAttribute('data-deactivation-value', '');
    iframe.setAttribute('data-form-name', b.formName || '');
    iframe.setAttribute('data-height', String(b.height || 432));
    iframe.setAttribute('data-layout-iframe-id', 'inline-' + b.formId);
    iframe.setAttribute('data-form-id', b.formId);
    iframe.setAttribute('data-cookie-consent', 'true');
    iframe.setAttribute('data-cookie-consent-provider', 'auto');
    frameWrap.appendChild(iframe);
    wrap.appendChild(frameWrap);
    if (b.footnote) wrap.appendChild(el('p', 'form__footnote', b.footnote));

    loadGhlScript(b.scriptSrc);

    var advanced = false;

    /* Matched by sender, not origin: the widget can end up served from
       a different GHL domain than the one in its src. */
    function onMessage(ev) {
      if (ev.source !== iframe.contentWindow) return;
      var shown; try { shown = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data); } catch (e) { shown = ev.data; }
      console.log('[iDecide] message from GHL form', ev.origin, shown);
      if (advanced) return;
      var d = ev.data;
      /* What a submission actually sends (read from form_embed.js):
         ["set-sticky-contacts", "embedded_iframe_<id>" | "_ud", ...] -
         GHL storing the new contact and flagging leadCollected. On
         load the form only sends iframeLoaded / fetch-* messages, so
         set-sticky-contacts is the submit signal. The text match is
         kept as a fallback in case GHL adds an explicit event. */
      var isSubmit = Array.isArray(d) && d[0] === 'set-sticky-contacts';
      if (!isSubmit) {
        var text = typeof d === 'string' ? d : (function () { try { return JSON.stringify(d); } catch (e) { return ''; } })();
        isSubmit = /form[_-]?submit|submitted|submit[_-]?success/i.test(text || '');
      }
      if (!isSubmit) return;
      advanced = true;
      window.removeEventListener('message', onMessage);
      ctx.record.note('ghl-form-submit', b.formId);
      ctx.register();
      ctx.navigate(b.then);
    }
    window.addEventListener('message', onMessage);

    return wrap;
  }

  /* ---------- shared: the arrow, and a button for any action ------- */

  /* The circled arrow from the design: drawn, not a glyph, so it sits
     on the same line in every font. circle:false gives the bare arrow
     used on the smaller outlined buttons. */
  function arrowMark(circle) {
    var n = el('span', 'arrow' + (circle ? ' arrow--circle' : ''));
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      (circle ? '<circle cx="12" cy="12" r="10.5"/>' : '') +
      '<path d="M7 12h10M13 8l4 4-4 4"/></svg>';
    return n;
  }

  /* { "label":"...", "to":"S10" | "link":"pack-3" | "href":"https://...",
       "weight":"primary"|"outline", "circle":true } */
  function actionButton(a, ctx, extra) {
    var btn = el('button', 'btn' + (a.weight === 'outline' ? ' btn--outline' : '') +
      (extra ? ' ' + extra : ''));
    btn.type = 'button';
    btn.appendChild(el('span', 'btn__label', a.label));
    btn.appendChild(arrowMark(a.circle !== false && a.weight !== 'outline'));
    btn.addEventListener('click', function () {
      ctx.record.note('action', B_plain(a.label));
      ctx.go(a);
    });
    return btn;
  }
  function B_plain(t) { return plainText(t); }

  /* ==================================================================
     BLOCK: offers - products side by side, each with its own button
     to that product's page. Two looks:
       "variant":"cards"    rounded cards (memberships)
       "variant":"columns"  open columns with fine dividers (passes)
     Every item fills every row, so names, prices and buttons line up
     across the row whatever the copy length.

     { "type":"offers", "variant":"cards", "title":"...", "intro":"...",
       "items":[{ "id":"vita-restore", "name":"Vita Restore",
                  "price":597, "per":"/month", "hours":"36 Lounge hours",
                  "hoursNote":"(per month)", "rate":"$16.58 per hour*",
                  "text":"...", "features":["Priority booking"],
                  "validity":"...", "cta":"Choose Vita Restore",
                  "emphasis":true, "period":"a month" }],
       "footnotes":["*..."] }
     ================================================================== */
  var OFFER_ROWS = ['name', 'price', 'hours', 'rate', 'text', 'features', 'validity', 'cta'];

  function offers(b, ctx) {
    var section = el('section', 'offers offers--' + (b.variant || 'cards'));
    var titleId = null;
    if (b.title) {
      var t = el('h3', 'offers__title', b.title);
      titleId = t.id = 'offers-' + Math.random().toString(36).slice(2, 7);
      section.appendChild(t);
      section.setAttribute('aria-labelledby', titleId);
    }
    if (b.intro) section.appendChild(el('p', 'offers__intro', b.intro));

    /* Only the rows some item actually uses become grid rows. */
    var rows = OFFER_ROWS.filter(function (r) {
      if (r === 'name' || r === 'price' || r === 'cta') return true;
      return (b.items || []).some(function (i) {
        return r === 'features' ? (i.features && i.features.length) : i[r];
      });
    });

    var list = el('ul', 'offers__list');
    list.style.setProperty('--rows', rows.length);
    list.style.setProperty('--cols', (b.items || []).length);

    (b.items || []).forEach(function (item) {
      var li = el('li', 'offer' + (item.emphasis ? ' offer--emphasis' : ''));
      rows.forEach(function (r) {
        var cell;
        if (r === 'name') {
          cell = el(b.title ? 'h4' : 'h3', 'offer__name', item.name);
        } else if (r === 'price') {
          cell = el('p', 'offer__price');
          cell.appendChild(el('span', 'offer__amount', money(item.price)));
          if (item.per) cell.appendChild(el('span', 'offer__per', item.per));
        } else if (r === 'hours') {
          cell = el('p', 'offer__hours');
          if (item.hours) cell.appendChild(el('span', 'offer__hours-main', item.hours));
          if (item.hoursNote) cell.appendChild(el('span', 'offer__hours-note', item.hoursNote));
        } else if (r === 'rate') {
          cell = el('p', 'offer__rate', item.rate || '');
        } else if (r === 'text') {
          cell = el('p', 'offer__text', item.text || '');
        } else if (r === 'features') {
          cell = el('ul', 'offer__features');
          (item.features || []).forEach(function (f) {
            var fi = el('li');
            fi.appendChild(richText(f));
            cell.appendChild(fi);
          });
        } else if (r === 'validity') {
          cell = el('p', 'offer__validity', item.validity || '');
        } else {
          cell = el('div', 'offer__action');
          var btn = el('button', 'btn ' + (item.emphasis ? 'btn--fill' : 'btn--outline'));
          btn.type = 'button';
          btn.appendChild(el('span', 'btn__label', item.cta || ('View ' + item.name)));
          btn.appendChild(arrowMark(false));
          btn.addEventListener('click', function () {
            ctx.record.note('chose-offer', item.id);
            var offer = { id: item.id, name: item.name, price: item.price, period: item.period || null };
            if (!ctx.leave(item.link || item.id, offer) && item.to) ctx.navigate(item.to);
          });
          cell.appendChild(btn);
        }
        cell.classList.add('offer__cell', 'offer__cell--' + r);
        li.appendChild(cell);
      });
      list.appendChild(li);
    });
    section.appendChild(list);

    (b.footnotes || []).forEach(function (fn) {
      section.appendChild(el('p', 'offers__footnote', fn));
    });
    return section;
  }

  /* ==================================================================
     BLOCK: memberNote - the membership worth knowing about, set beside
     the hour passes: the saving, what it is measured against, and
     the terms, kept together so none of it reads without the rest.

     { "type":"memberNote", "kicker":"...", "text":"...",
       "big":"more than 1/2 OFF", "bigAfter":"our standard $100 hourly rate.",
       "detail":"**Discounted hourly rate:** ...", "italic":"...",
       "terms":"line\nline", "action":{"label":"...","to":"S10"} }
     ================================================================== */
  function memberNote(b, ctx) {
    var n = el('section', 'member-note');
    if (b.kicker) n.appendChild(el('h3', 'member-note__kicker', b.kicker));
    if (b.text) n.appendChild(paragraphs(b.text, 'member-note__text'));
    if (b.big) {
      var save = el('p', 'member-note__save');
      save.appendChild(el('span', 'member-note__big', b.big));
      if (b.bigAfter) save.appendChild(el('span', 'member-note__vs', b.bigAfter));
      n.appendChild(save);
    }
    if (b.detail) n.appendChild(paragraphs(b.detail, 'member-note__detail'));
    if (b.italic) n.appendChild(el('p', 'member-note__italic', b.italic));
    if (b.terms) n.appendChild(paragraphs(b.terms, 'member-note__terms'));
    if (b.action) n.appendChild(actionButton(b.action, ctx, 'member-note__action'));
    return n;
  }

  /* ==================================================================
     BLOCK: explore - a panel that points to everything at once: a
     heading, a few informational rows (not buttons), and one action.

     { "type":"explore", "title":"...", "intro":"...",
       "rows":[{"h":"Residential systems","t":"..."}],
       "action":{"label":"Explore all options","href":"https://..."},
       "caption":"access.radiantwavelounge.com" }
     ================================================================== */
  function explore(b, ctx) {
    var n = el('section', 'explore');
    if (b.title) n.appendChild(el('h3', 'explore__title', b.title));
    if (b.intro) n.appendChild(el('p', 'explore__intro', b.intro));
    if (b.rows && b.rows.length) {
      var dl = el('dl', 'explore__rows');
      b.rows.forEach(function (r) {
        var row = el('div', 'explore__row');
        row.appendChild(el('dt', null, r.h));
        row.appendChild(el('dd', null, r.t));
        dl.appendChild(row);
      });
      n.appendChild(dl);
    }
    if (b.action) n.appendChild(actionButton(b.action, ctx, 'btn--block'));
    if (b.caption) n.appendChild(el('p', 'explore__caption', b.caption));
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
    form: form,
    ghlForm: ghlForm,
    offers: offers,
    memberNote: memberNote,
    explore: explore
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
    paragraphs: paragraphs,
    richText: richText,
    plainText: plainText
  };

})(window, document);
