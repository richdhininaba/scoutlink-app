# ScoutLink - Football Player Intelligence Platform

Built by **Stratex Analytics**

Live: https://richdhininaba.github.io/scoutlink-app/frontend/index.html

API: https://scoutlink-api.vercel.app

## Architecture

- **Frontend**: Static HTML/CSS/JS on GitHub Pages
- **Backend API**: Node.js/Express on Vercel
- **Database**: Supabase PostgreSQL (fwxnggklfsgrydcoeiuh)
- **Emails**: SendGrid

## Environment Variables (set in Vercel)

```
SUPABASE_URL=https://fwxnggklfsgrydcoeiuh.supabase.co
SUPABASE_ANON_KEY=<from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase>
SUPABASE_JWT_SECRET=<Supabase JWT secret from Project Settings > API > JWT Settings>
SENDGRID_API_KEY=<your SendGrid API key>
JWT_SECRET=<long random string>
```

## Database Setup

1. Run `database/schema.sql` in Supabase SQL Editor
2. Run `database/migration_v2.1.sql` to add subscription columns and RLS policies

## Bug Fixes (v2.1)

### Bug 1: Admin Login Loop Fixed
- Login page clears storage on logout param
- Only auto-redirects if BOTH valid session AND role type exist
- No more loop between login and dashboard

### Bug 2: Side Navigation Fixed
- Stratex: Dashboard, Registrations, Users, Players, Scouts, Coaches, Scout Teams, School Teams, Notifications, Settings
- Scout: Dashboard, Player Search, My Pipeline, Rankings, Fixtures, Predictions, Exports, Notifications, Settings
- Coach: Dashboard, My Players, Add Players, Bulk Add Players, Match Facts, Fixtures, Video Reels, Notifications, Settings
- Player: Dashboard, My Profile, Video Reels, Notifications, Settings

### Bug 3: Registrations Now Load
- Backend auth middleware now accepts Supabase JWTs
- RLS policies updated to allow service role full access
- Registration endpoint returns proper error details

### Bug 4: Approve/Decline Flow
- Email failures no longer block approve/decline
- User records created in correct tables on approval
- Login codes generated and included in response

### Bug 5: All Data Loads
- Fixed column names across all routes
- Notifications works for all roles
- Videos endpoint uses correct column names
- Match facts correctly maps all fields

### Bug 6: All Pages Reachable
- 21 new pages created to cover all nav links
