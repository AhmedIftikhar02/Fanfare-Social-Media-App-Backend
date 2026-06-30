// src/views/statusPage.js

const renderStatusPage = (env, dbOk) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fanfare API</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p.sub { margin: 0 0 24px; opacity: 0.85; font-size: 14px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0,200,120,0.18);
      border: 1px solid rgba(0,200,120,0.4);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #2ecc71; }
    .links { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
    a.link {
      color: #fff;
      text-decoration: none;
      background: rgba(255,255,255,0.12);
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      transition: background 0.15s;
    }
    a.link:hover { background: rgba(255,255,255,0.22); }
    .meta { margin-top: 24px; font-size: 12px; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> API Online</div>
    <h1>Fanfare Backend</h1>
    <p class="sub">Express + Prisma + Neon PostgreSQL — running on Vercel</p>
    <div class="links">
      <a class="link" href="/api-docs">API Documentation (Swagger)</a>
      <a class="link" href="/api/v1/health">Health Check (JSON)</a>
    </div>
    <div class="meta">
      env: ${env} &nbsp;•&nbsp; database: ${dbOk ? 'connected' : 'unreachable'}
    </div>
  </div>
</body>
</html>
`;

module.exports = { renderStatusPage };