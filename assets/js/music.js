/* ==================================================================
   RWT-iDecide - background music

   One audio element that outlives every slide, parked in the bottom
   left. It starts itself where the browser allows it, and where the
   browser does not, it starts on the first thing the visitor clicks -
   which on this funnel is the sign-in button, a few seconds in.

   It ducks rather than stops while a film is running, because the
   films carry narration and two voices at once is nobody's idea of
   calm.

   Public surface:
     Music.mount(spec)   build it and try to start
     Music.duck(on)      pull the level down while a film plays
   ================================================================== */

(function (window, document) {
  'use strict';

  var KEY = 'idecide:music';

  var ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8 12.5 8l-8 5.2Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4.5" y="3" width="2.6" height="10" rx="1" fill="currentColor"/><rect x="8.9" y="3" width="2.6" height="10" rx="1" fill="currentColor"/></svg>',
    prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.5 3.2 5.5 8l6 4.8Z" fill="currentColor"/><rect x="3.6" y="3.2" width="1.5" height="9.6" rx=".7" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3.2 10.5 8l-6 4.8Z" fill="currentColor"/><rect x="10.9" y="3.2" width="1.5" height="9.6" rx=".7" fill="currentColor"/></svg>',
    quiet: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.4L8.2 3.2v9.6L4.9 10H2.5Z" fill="currentColor"/><path d="M10.8 6.4l3.2 3.2M14 6.4l-3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    loud: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.4L8.2 3.2v9.6L4.9 10H2.5Z" fill="currentColor"/><path d="M10.6 6.3a2.4 2.4 0 0 1 0 3.4M12.4 4.6a4.9 4.9 0 0 1 0 6.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function btn(cls, label, icon) {
    var b = el('button', 'bgm__btn ' + cls);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = icon;
    return b;
  }

  var Music = {
    audio: null,
    root: null,
    tracks: [],
    i: 0,
    level: 0.4,
    duckTo: 0.08,
    ducked: false,

    mount: function (spec) {
      if (this.root || !spec || !spec.tracks || !spec.tracks.length) return;

      this.tracks = spec.tracks.slice();
      this.level = typeof spec.volume === 'number' ? spec.volume : 0.4;
      this.duckTo = typeof spec.duckTo === 'number' ? spec.duckTo : 0.08;

      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { /* private mode */ }
      if (saved) {
        if (typeof saved.i === 'number' && saved.i < this.tracks.length) this.i = saved.i;
        if (typeof saved.level === 'number') this.level = saved.level;
      }

      var self = this;

      this.audio = document.createElement('audio');
      this.audio.preload = 'auto';
      this.audio.volume = this.level;
      this.audio.addEventListener('ended', function () { self.step(1); });
      this.audio.addEventListener('play', function () { self.paint(); });
      this.audio.addEventListener('pause', function () { self.paint(); });

      /* ---------- the control ---------- */
      var root = el('div', 'bgm');
      root.setAttribute('aria-label', 'Background music');

      var toggle = btn('bgm__toggle', 'Play music', ICON.play);
      toggle.addEventListener('click', function () { self.toggle(); });

      /* Four bars that move only while something is playing - the one
         piece of ornament here, and it doubles as the status. */
      var eq = el('span', 'bgm__eq');
      eq.setAttribute('aria-hidden', 'true');
      for (var n = 0; n < 4; n++) eq.appendChild(el('i'));

      var prev = btn('bgm__prev', 'Previous track', ICON.prev);
      prev.addEventListener('click', function () { self.step(-1); });

      var next = btn('bgm__next', 'Next track', ICON.next);
      next.addEventListener('click', function () { self.step(1); });

      var count = el('span', 'bgm__count');

      var vol = document.createElement('input');
      vol.className = 'bgm__vol';
      vol.type = 'range';
      vol.min = 0; vol.max = 100; vol.step = 1;
      vol.value = Math.round(this.level * 100);
      vol.setAttribute('aria-label', 'Music volume');
      vol.addEventListener('input', function () {
        self.level = vol.value / 100;
        if (!self.ducked) self.audio.volume = self.level;
        self.paint();
        self.save();
      });

      var volIcon = el('span', 'bgm__volicon');
      volIcon.setAttribute('aria-hidden', 'true');

      var panel = el('div', 'bgm__panel');
      panel.appendChild(prev);
      panel.appendChild(next);
      panel.appendChild(count);
      panel.appendChild(volIcon);
      panel.appendChild(vol);

      root.appendChild(toggle);
      root.appendChild(eq);
      root.appendChild(panel);
      root.appendChild(this.audio);

      this.root = root;
      this.ui = { toggle: toggle, count: count, vol: vol, volIcon: volIcon };
      document.body.appendChild(root);

      this.load(this.i);
      this.paint();

      /* Try to start. Browsers refuse audio until the visitor has
         interacted with the page, so if this is refused we wait and
         start on the first click - which here is the sign-in. */
      this.audio.play().catch(function () {
        self.paint();
        var wake = function () {
          document.removeEventListener('pointerdown', wake, true);
          document.removeEventListener('keydown', wake, true);
          if (self.audio.paused && !self.stoppedByHand) {
            self.audio.play().catch(function () {});
          }
        };
        document.addEventListener('pointerdown', wake, true);
        document.addEventListener('keydown', wake, true);
      });
    },

    load: function (i) {
      this.i = (i + this.tracks.length) % this.tracks.length;
      this.audio.src = this.tracks[this.i];
      this.audio.volume = this.ducked ? this.duckTo : this.level;
      this.save();
      this.paint();
    },

    step: function (by) {
      var wasPlaying = !this.audio.paused;
      this.load(this.i + by);
      if (wasPlaying || this.stoppedByHand !== true) {
        var self = this;
        this.audio.play().catch(function () { self.paint(); });
      }
    },

    toggle: function () {
      if (this.audio.paused) {
        this.stoppedByHand = false;
        this.audio.play().catch(function () {});
      } else {
        this.stoppedByHand = true;
        this.audio.pause();
      }
    },

    /* A film is speaking. Drop under it rather than stopping, so the
       music is still there when the film finishes. */
    duck: function (on) {
      if (!this.audio) return;
      this.ducked = !!on;
      this.audio.volume = this.ducked ? this.duckTo : this.level;
      if (this.root) this.root.classList.toggle('is-ducked', this.ducked);
    },

    paint: function () {
      if (!this.root) return;
      var playing = !this.audio.paused;
      this.root.classList.toggle('is-playing', playing);
      this.ui.toggle.innerHTML = playing ? ICON.pause : ICON.play;
      this.ui.toggle.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      this.ui.count.textContent = (this.i + 1) + ' / ' + this.tracks.length;
      this.ui.volIcon.innerHTML = this.level > 0.01 ? ICON.loud : ICON.quiet;
    },

    save: function () {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ i: this.i, level: this.level }));
      } catch (e) { /* ignore */ }
    }
  };

  window.Music = Music;

})(window, document);
