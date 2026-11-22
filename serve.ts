// A tiny static server for local play-testing: serves game/ at
// http://localhost:8080 with the right content types for HTML, JS and
// images. Nothing here ships in the entry; the game itself is static files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(here, 'game');
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  try {
    // Only paths inside game/ are served; anything else is a 403 or 404.
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = join(gameDir, path === '/' ? 'index.html' : path);
    if (!file.startsWith(gameDir)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Midnight Heist at http://localhost:${port}`);
});
