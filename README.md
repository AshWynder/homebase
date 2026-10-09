# Homebase

Homebase is a rental management platform that connects **property owners**, **caretakers** and **tenants** in one app. It handles day-to-day property operations: units, rent payments, utility meter readings, maintenance requests, notices and in-app chat. It's built as a monorepo with a NestJS API and an Expo (React Native) client for iOS, Android and web.

## Features

- **Role-based access control (RBAC):** three roles with scoped permissions
- **Unit management:** create and manage properties and units, and assign tenants to them
- **Payments:** track rent and other charges per tenant and unit
- **Meter readings:** record and review utility readings (water, electricity) for billing
- **Maintenance tickets:** tenants raise issues, caretakers triage and update status, owners keep oversight
- **Notices:** announcements from owners and caretakers to tenants
- **Real-time chat:** direct messaging between roles over WebSockets

## Roles

| Role | What they can do |
| --- | --- |
| **Owner** | Oversees properties and units, views payments and reports, manages caretakers, posts notices |
| **Caretaker** | Day-to-day operations: records meter readings, handles maintenance tickets, manages units and notices, chats with tenants |
| **Tenant** | Pays rent, submits and tracks maintenance tickets, reads notices, chats with the caretaker or owner |

## Tech Stack

**Server** (`/server`)
- NestJS 11 + TypeScript
- PostgreSQL with Prisma 7 (`@prisma/adapter-pg`)
- Authentication with [Better Auth](https://www.better-auth.com/) (Prisma adapter)
- Real-time messaging via Socket.IO (`@nestjs/websockets`)
- File storage on AWS S3
- Validation with `class-validator` / `class-transformer`
- Testing with Jest and Supertest

**Client** (`/client`)
- Expo 57, React Native 0.86, React 19
- File-based routing with `expo-router`
- Styling with NativeWind (Tailwind) and `@rn-primitives` components
- Data fetching with TanStack Query and Axios
- State with Zustand; forms with React Hook Form + Zod
- Chat UI with `react-native-gifted-chat` and `socket.io-client`

## Project Structure

```
homebase/
├── client/          # Expo app (iOS, Android, web)
├── server/          # NestJS API
│   ├── prisma/      # Schema, migrations, seed script
│   └── src/
├── package.json     # Root scripts to run both apps together
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- An AWS S3 bucket (or S3-compatible storage) for file uploads
- Android Studio / Xcode if you want to run native emulators

### Installation

```bash
git clone https://github.com/AshWynder/homebase.git
cd homebase
npm run install:all
```

### Environment Variables

The server loads its config from `server/.env.development` (dev) and `server/.env.production` (prod). Create `server/.env.development`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/homebase
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000

# S3
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
```

> Adjust these names to match what your code actually reads. Commit a `.env.example` with placeholder values.

For the client, set the API base URL to point at your server (for example via `EXPO_PUBLIC_API_URL`).

### Database

```bash
cd server
npx prisma migrate dev
npm run seed        # optional: populate with sample data (uses @faker-js/faker)
```

### Run in Development

From the repo root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Server + Expo dev server |
| `npm run dev:web` | Server + web client (port 8082) |
| `npm run dev:client:android` | Server + Android emulator |
| `npm run dev:client:ios` | Server + iOS simulator |
| `npm run dev:server` | Server only |
| `npm run dev:client` | Client only |

## Scripts

| Command | Description |
| --- | --- |
| `npm run install:all` | Install root, client and server dependencies |
| `npm run build:server` | Build the NestJS server |
| `npm run lint` | Lint client and server |
| `npm run seed` | Seed the database |
| `npm run test:server` | Run server unit tests |

Inside `server/` you can also run `npm run test:e2e`, `npm run test:cov` and `npm run start:prod`.

## Production

```bash
npm run build:server
cd server && npm run start:prod
```

Make sure `server/.env.production` is configured and migrations are applied with `npx prisma migrate deploy`.

## Roadmap

- [ ] Feature
- [ ] Feature

## Contributing

1. Fork the repo and create a feature branch
2. Run `npm run lint` and `npm run test:server` before opening a PR
3. Open a pull request describing your changes

## License

UNLICENSED, private project. <!-- Change if you open-source it. -->