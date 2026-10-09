# Homebase

Monorepo for the Homebase property-management platform.

## Layout

```
.
├── client/   # Expo / React Native app
├── server/   # NestJS API (Prisma, PostgreSQL, Socket.IO)
└── .agents/  # shared AI agent skills (canonical source)
```

Other `.claude/`, `.cursor/`, `.devin/` and `.windsurf/` directories hold per-tool skill links that point back into `.agents/`.

## Requirements

- Node.js 20+
- PostgreSQL

## Setup

```bash
npm run install:all
```

Create `server/.env.development` (see `server/.env.development` for the expected keys) before starting the API.

## Development

```bash
npm run dev            # server + Expo client
npm run dev:server     # API only
npm run dev:client     # Expo only (dev client)
npm run dev:web        # Expo web
```

## Database

```bash
npm run seed           # seed the database
```

Migrations live in `server/prisma/migrations` and are run from the `server/` package:

```bash
cd server
npx prisma migrate dev
```

## Checks

```bash
npm run lint
npm run test:server
npm run build:server
```
