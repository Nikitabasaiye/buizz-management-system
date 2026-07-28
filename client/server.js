const { createServer } = require('http');
const next = require('next');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dev = process.env.NODE_ENV === 'development';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const buildStaticDir = path.resolve(__dirname, 'next-build', 'static');
const publicDir = path.resolve(__dirname, 'public');
const buildIdFile = path.resolve(__dirname, 'next-build', 'BUILD_ID');
const buildId = fs.existsSync(buildIdFile)
  ? fs.readFileSync(buildIdFile, 'utf8').trim()
  : 'missing';

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const safeFilePath = (root, relativePath) => {
  let decoded;
  try {
    decoded = decodeURIComponent(relativePath).replace(/^[/\\]+/, '');
  } catch {
    return null;
  }
  const resolved = path.resolve(root, decoded);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`)
    ? resolved
    : null;
};

const streamFile = (req, res, filePath, immutable = false) => {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;

  const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader(
    'Cache-Control',
    immutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600, must-revalidate',
  );
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      if (start <= end && end < stat.size) {
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', end - start + 1);
        if (req.method === 'HEAD') {
          res.end();
        } else {
          fs.createReadStream(filePath, { start, end }).pipe(res);
        }
        return true;
      }
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', stat.size);
  if (req.method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
  return true;
};

app.prepare().then(() => {
  createServer((req, res) => {
    res.setHeader('X-Buizz-Build', buildId);
    if (req.url === '/_buizz/health') {
      res.statusCode = buildId === 'missing' ? 503 : 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({
        status: buildId === 'missing' ? 'error' : 'ok',
        buildId,
        staticDirectory: fs.existsSync(buildStaticDir),
        publicDirectory: fs.existsSync(publicDir),
      }));
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (requestUrl.pathname.startsWith('/_next/static/')) {
        const relative = requestUrl.pathname.slice('/_next/static/'.length);
        const filePath = safeFilePath(buildStaticDir, relative);
        if (filePath && streamFile(req, res, filePath, true)) return;
      } else {
        const filePath = safeFilePath(publicDir, requestUrl.pathname);
        if (filePath && streamFile(req, res, filePath, false)) return;
      }
    }

    // Never allow a CDN/browser to retain route HTML across deployments.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    handle(req, res);
  }).listen(port, hostname, (err) => {
    if (err) {
      throw err;
    }

    process.stdout.write(`Buizz client ready on http://${hostname}:${port}\n`);
  });
});
