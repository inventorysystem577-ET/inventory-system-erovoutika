# Inventory System

A Next.js 16 + React 19 + Tailwind CSS 4 inventory management system with Supabase backend.

## Prerequisites

- **Node.js**: >= 18.17.0 (recommended: 20.x LTS)
- **npm**: >= 9.0.0

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd inventory-system
npm install
```

### 2. Environment Setup

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values from [Supabase](https://app.supabase.com/project/_/settings/api):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Common Issues

### ESLint Errors
If you see ESLint version conflicts, delete `node_modules` and `package-lock.json`, then reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Missing Environment Variables
The app will throw an error if Supabase env vars are missing. Make sure `.env.local` exists with the correct values.

### Node Version Mismatch
If you get Node version errors, use nvm to switch:
```bash
nvm install 20
nvm use 20
```

## Build for Production

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Push your code to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.x
- **Styling**: Tailwind CSS 4
- **Database**: Supabase
- **Auth**: Supabase Auth
- **Icons**: Lucide React

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
