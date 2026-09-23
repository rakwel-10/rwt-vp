/* A very small Chrome DevTools Protocol client - just enough to send
   a genuinely trusted mouse click into the page.

   This matters: a click made with dispatchEvent() in the page is not
   trusted and does not grant user activation, so the browser still
   refuses to let the page make a sound. Only a real input event does,
   and that has to come from outside the page. Hence CDP. */
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
      const t = list.find(x => x.type === 'page' && x.url.indexOf(match) !== -1);
      if (t && t.webSocketDebuggerUrl) return t;
    } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('no CDP page target matching ' + match);
}

/* ---- the smallest websocket client that will carry CDP ---- */
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        'GET ' + u.pathname + u.search + ' HTTP/1.1\r\n' +
        'Host: ' + u.host + '\r\n' +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        'Sec-WebSocket-Key: ' + key + '\r\nSec-WebSocket-Version: 13\r\n\r\n');
    });
    sock.on('error', reject);

    let handshook = false, buf = Buffer.alloc(0);
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      if (!handshook) {
        const end = buf.indexOf('\r\n\r\n');
        if (end === -1) return;
        handshook = true;
        buf = buf.slice(end + 4);
        resolve({
          send(obj) {
            const body = Buffer.from(JSON.stringify(obj));
            const mask = crypto.randomBytes(4);
            const len = body.length;
            let head;
            if (len < 126) head = Buffer.from([0x81, 0x80 | len]);
            else { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 0xFE; head.writeUInt16BE(len, 2); }
            const masked = Buffer.alloc(len);
            for (let i = 0; i < len; i++) masked[i] = body[i] ^ mask[i % 4];
            sock.write(Buffer.concat([head, mask, masked]));
          },
          close() { try { sock.destroy(); } catch (e) {} }
        });
      }
      /* Replies are not needed here, so frames are simply drained. */
      buf = Buffer.alloc(0);
    });
  });
}

/* A press and a release at one point - a real click as far as the
   renderer is concerned, which is the whole purpose. */
async function trustedClick(port, urlMatch, x, y) {
  const t = await findPage(port, urlMatch);
  const ws = await connect(t.webSocketDebuggerUrl);
  let id = 1;
  const base = { x: x, y: y, button: 'left', clickCount: 1, buttons: 1 };
  ws.send({ id: id++, method: 'Input.dispatchMouseEvent', params: Object.assign({ type: 'mousePressed' }, base) });
  await new Promise(r => setTimeout(r, 40));
  ws.send({ id: id++, method: 'Input.dispatchMouseEvent', params: Object.assign({ type: 'mouseReleased' }, base, { buttons: 0 }) });
  await new Promise(r => setTimeout(r, 120));
  ws.close();
}

module.exports = { trustedClick };
