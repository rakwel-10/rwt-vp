/* Runs the tools pages that need a real server and a real clock.

     node tools/run.js tools/media.html
     node tools/run.js tools/overflow.html
     node tools/run.js --strict tools/autoplay.html

   Three pages cannot be opened straight off disk and still mean
   anything. media.html needs Range requests to time how soon a film
   is playable; overflow.html reads inside iframes, which browsers
   forbid across file:// origins; autoplay.html needs a trusted click
   from outside the page. So this serves the project over http and
   waits for the page to report back on /__done rather than sampling
   the DOM at load - some of these take minutes.

   The other tools pages have no such need: open them in a browser.

   --strict  leaves the autoplay policy alone, so the page sees what
             a visitor's browser would really do. Without it Chrome is
             told to allow autoplay, which is right for the film tests
             and wrong for the autoplay one.
   --headful shows the window. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const cdp = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8153;
const DEBUG_PORT = 9276;
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe'
].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

if (!CHROME) {
  console.log('Chrome not found. Set CHROME to its full path and run again.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg'
};

const args = process.argv.slice(2);
const strict = args.indexOf('--strict') !== -1;
const page = args.filter(a => a.indexOf('--') !== 0)[0] || 'tools/media.html';

let done = false;
let chrome;

const server = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');

  /* The page asks for a real click here. It cannot make one itself:
     an event from dispatchEvent() is untrusted and grants no user
     activation, so the browser would still refuse to unmute. */
  if (u.pathname === '/__click') {
    cdp.trustedClick(DEBUG_PORT, '/' + page, 200, 200)
      .then(() => { s.writeHead(204).end(); })
      .catch(err => { console.log('CLICK FAILED  ' + err.message); s.writeHead(500).end(); });
    return;
  }

  if (u.pathname === '/__done') {
    console.log(decodeURIComponent(u.searchParams.get('r') || '(empty)'));
    s.writeHead(204).end();
    done = true;
    setTimeout(() => {
      try { chrome.kill(); } catch (e) {}
      server.close();
      process.exit(0);
    }, 150);
    return;
  }

  let rel = decodeURIComponent(u.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel));
  if (!file.startsWith(path.normalize(ROOT))) { s.writeHead(403).end(); return; }

  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { s.writeHead(404).end('no'); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const range = q.headers.range;

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const a = m[1] === '' ? 0 : Number(m[1]);
        const b = m[2] === '' ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
        s.writeHead(206, {
          'Content-Type': type,
          'Content-Length': b - a + 1,
          'Content-Range': 'bytes ' + a + '-' + b + '/' + st.size,
          'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(file, { start: a, end: b }).pipe(s);
        return;
      }
    }
    s.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(s);
  });
});

server.listen(PORT, () => {
  const headful = args.indexOf('--headful') !== -1;
  const flags = [];
  if (!headful) flags.push('--headless=new', '--disable-gpu');
  flags.push('--no-first-run');
  flags.push('--remote-debugging-port=' + DEBUG_PORT);
  flags.push('--window-size=1280,900');
  flags.push('--user-data-dir=' + path.join(os.tmpdir(), 'idecide-chrome-' + (strict ? 'strict' : 'relaxed')));
  if (!strict) flags.push('--autoplay-policy=no-user-gesture-required');
  flags.push('http://localhost:' + PORT + '/' + page);

  console.log(strict ? '(browser default autoplay policy)' : '(autoplay policy relaxed)');
  chrome = spawn(CHROME, flags, { stdio: 'ignore' });

  setTimeout(() => {
    if (!done) {
      console.log('TIMED OUT - the page never reported back');
      try { chrome.kill(); } catch (e) {}
      process.exit(1);
    }
  }, 600000);
});
