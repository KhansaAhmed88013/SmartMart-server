# SmartMart Server

Node.js + Express + Sequelize backend for SmartMart (MVC structure).

## Tech Stack

- Node.js
- Express
- Sequelize
- MySQL
- Nodemailer

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- MySQL running and reachable

## Environment Variables

Create/update `.env` in the server root.

```env
PORT=5000
DB_DATABASE=smartmart
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306
MY_EMAIL=your-email@example.com
MY_PASSWORD=your-app-password
```

Notes:

- Local default port is `5000` if `PORT` is not set.
- Keep secrets out of git.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Server URL:

```text
http://localhost:5000
```

## Health Endpoint

- Method: `GET`
- URL: `/health`

Example:

```bash
curl http://localhost:5000/health
```

## Smoke Tests

Run quick regression checks:

```bash
npm run smoke
```

## Scripts

- `npm start` -> start server
- `npm run dev` -> run with nodemon
- `npm test` -> run smoke checks (`test.js`)
- `npm run smoke` -> run smoke checks (`test.js`)

## Expected Startup Logs

Healthy startup usually includes:

- `Server running on http://localhost:5000`
- `Database connected`
- `Tables synced`

If database credentials are wrong, common error:

- `ER_ACCESS_DENIED_ERROR`

If MySQL is not running/reachable, common error:

- `ECONNREFUSED`

## Render Redeploy Checklist (Backend)

1. Confirm all intended changes are committed.
2. Push to the branch connected to Render.
3. Verify Render environment variables (`PORT`, DB values, mail values).
4. Trigger deploy (or let auto-deploy run).
5. After deploy, test `GET https://<your-render-service>/health`.
