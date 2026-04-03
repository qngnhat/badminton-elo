# Badminton Elo

ELO rating system for badminton clubs. Track player ratings, auto-balance teams, and view match history.

## Features

- **Elo Rating**: Standard Elo with K-factor adjustments for new players, guests, and inactive members
- **Auto Team Balancer**: Brute-force optimal team splits for 4-8 players, snake draft for larger groups
- **Score Margin**: Winning by more = more Elo change
- **Guest Handling**: Guests get high K-factor, members are protected when playing with guests
- **Leaderboard**: Tier ranks (S/A/B/C), filter by active/members/all
- **Match History**: Full history with Elo changes per player
- **Player Profiles**: Form tracker (last 5 matches), stats, match history

## Setup

```bash
npm install
cp .env.example .env  # Add your DATABASE_URL
npx prisma migrate dev
npm run dev
```

## Tech Stack

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS

## Deploy

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add `DATABASE_URL` env var (get free DB at [neon.tech](https://neon.tech))
4. Deploy
