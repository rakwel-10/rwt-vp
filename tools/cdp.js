/* A very small Chrome DevTools Protocol client.

   It exists for one reason: some things cannot be tested from inside
   the page. A click made with dispatchEvent() is untrusted and grants
   no user activation, so the browser goes on refusing to let the page
   make a sound - testing autoplay with one would prove the opposite
   of what a visitor gets. A real input event has to come from outside,
   and that means CDP.

   It also takes screenshots, which is the only honest way to look at
   a design change without asking someone to open a browser.

   No dependencies: the websocket framing is done by hand below, and
   it only has to be good enough to carry JSON to a local Chrome. */
const http = require('http');
const net = require('net');
const crypto = require('crypto');

function targets(port) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port, path: '/json/list' }, r => {
      let b = ''; r.on('data', d => b += d);
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

async function findPage(port, match, tries) {
  for (let n = 0; n < (tries || 40); n++) {
    try {
      const list = await targets(port);
      const t = list.find(x => x.type === 'page' && (!match || x.url.indexOf(match) !== -1));
      if (t && t.webSocketDebuggerUrl) return t;
    } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('no CDP page target' + (match ? ' matching ' + match : ''));
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        'GET ' + u.pathname + u.search + ' HTTP/1.1\r\n' +
        'Host: ' + u.host + '\r\n' +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Key: ' + crypto.randomBytes(16).toString('base64') +
        '\r\nSec-WebSocket-Version: 13\r\n\r\n');
    });
    sock.on('error', reject);

    let handshook = false;
    let buf = Buffer.alloc(0);
    let id = 0;
    const waiting = new Map();

    function send(obj) {
      const body = Buffer.from(JSON.stringify(obj));
      const mask = crypto.randomBytes(4);
      const len = body.length;
      let head;
      if (len < 126) { head = Buffer.from([0x81, 0x80 | len]); }
      else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 0xFE; head.writeUInt16BE(len, 2); }
      else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 0xFF; head.writeBigUInt64BE(BigInt(len), 2); }
      const masked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) masked[i] = body[i] ^ mask[i % 4];
      sock.write(Buffer.concat([head, mask, masked]));
    }

    /* Server frames are never masked and, from Chrome, never
       fragmented in a way that matters here. */
    function drain() {
      for (;;) {
        if (buf.length < 2) return;
        const len0 = buf[1] & 0x7F;
        let off = 2, len = len0;
        if (len0 === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len0 === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len).toString('utf8');
        buf = buf.slice(off + len);
        let msg; try { msg = JSON.parse(payload); } catch (e) { continue; }
        if (msg.id && waiting.has(msg.id)) {
          const { res, rej } = waiting.get(msg.id);
          waiting.delete(msg.id);
          msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
        }
      }
    }

    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      if (!handshook) {
        const end = buf.indexOf('\r\n\r\n');
        if (end === -1) return;
        handshook = true;
        buf = buf.slice(end + 4);
        resolve({
          call(method, params) {
            const n = ++id;
            return new Promise((res, rej) => {
              waiting.set(n, { res, rej });
              send({ id: n, method, params: params || {} });
              setTimeout(() => {
                if (waiting.has(n)) { waiting.delete(n); rej(new Error(method + ' timed out')); }
              }, 30000);
            });
          },
          close() { try { sock.destroy(); } catch (e) {} }
        });
      }
      drain();
    });
  });
}

/* A press and a release at one point - a real click as far as the
   renderer is concerned, which is the whole purpose. */
async function trustedClick(port, urlMatch, x, y) {
  const ws = await connect((await findPage(port, urlMatch)).webSocketDebuggerUrl);
  const base = { x, y, button: 'left', clickCount: 1, buttons: 1 };
  await ws.call('Input.dispatchMouseEvent', Object.assign({ type: 'mousePressed' }, base));
  await new Promise(r => setTimeout(r, 40));
  await ws.call('Input.dispatchMouseEvent', Object.assign({ type: 'mouseReleased' }, base, { buttons: 0 }));
  await new Promise(r => setTimeout(r, 120));
  ws.close();
}

module.exports = { targets, findPage, connect, trustedClick };
