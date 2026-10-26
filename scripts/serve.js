// 로컬 미리보기용 정적 파일 서버 (배포에는 필요 없음). 사용: npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const rel = decodeURIComponent(pathname).replace(/\/$/, '/index.html');
    const file = path.resolve(ROOT, '.' + path.posix.normalize('/' + rel));
    if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}.git`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(body);
    });
  })
  .listen(PORT, () => {
    console.log(`편집기: http://localhost:${PORT}/editor.html`);
    console.log(`열람:   http://localhost:${PORT}/?id=<공유ID>`);
  });
