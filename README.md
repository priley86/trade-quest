# TradeQuest

A kid-friendly investing game for Y Guides crews. Players begin with $1,000 in pretend money and will eventually trade stocks, Pokémon cards, and sports cards.

## Run locally

Requires Node 22.13+, Docker Desktop (running), and the [Dolt CLI](https://www.dolthub.com/docs/introduction/installation/).

```bash
npm install
npm run local:supabase
```

Start Dolt in another terminal and keep it running:

```bash
npm run local:dolt
```

Then prepare the local accounts and start the app:

```bash
npm run local:setup
npm run dev
```

Open [TradeQuest](http://localhost:3000).

- Local admin: `admin@tradequest.local`
- Local password: `TradeQuestLocal1!`
- Setup prints a crew invitation and saves it in `.local/welcome.txt`.
- [Supabase Studio](http://127.0.0.1:54323) lets you browse local users and tables.
- Local email is captured by [Mailpit](http://127.0.0.1:54324).
- Dolt listens on `127.0.0.1:3307`, database `tradequest`, user `root`, no password.

These credentials are only for local development. The setup script refuses to connect to hosted Supabase or replace hosted `.env.local` settings. It creates missing records without resetting balances or existing passwords; each run creates a new invitation. `.env.local` and `.local/` stay out of Git.

For later sessions, start Docker, run `npm run local:supabase`, `npm run local:dolt`, and `npm run dev`. You only need `local:setup` initially or after deliberately resetting local data. Stop Next.js and Dolt with Ctrl+C in their terminals; `npm run local:stop` stops Supabase and preserves its data. `supabase db reset` is destructive and is not part of normal startup.

## Try the game

1. Log in as the local admin and open **Crew control center** from the profile menu.
2. Edit the crew’s name, greeting, and HTTPS logo URL, or create another crew.
3. Create an invitation, choose its crew, and copy the link.
4. Open that link in a private browser window. Register a player with a name, email, and password.
5. Click **Open my portfolio** to receive the one-time $1,000 allocation in local Dolt.
6. Refresh or log out and back in: the session, membership, and balance persist.
7. Open **Crew leaderboard**, then choose a member to see that member’s portfolio.
8. As admin, revoke invitations, change another user’s role, or delete a player account.

Local email confirmation is disabled for convenient development. Phone signup is implemented but needs the phone provider enabled; configure a local test OTP or an SMS provider before using it. Use email for the quickest local walkthrough.

The public `/demo` route works without database configuration and is clearly labeled as sample data. `/invite/demo-quest` previews signup without creating accounts.

## Implemented

- Native Next.js App Router application with responsive, kid-friendly trading and portfolio views
- Crew-personalized signup, invitations, admin controls, profile editing, favorite-color avatars, and crew leaderboards
- Email or phone + password signup/login, server-managed sessions, refresh, logout, email confirmation, and phone verification
- Player-specific cash, holdings, cost basis, gains/losses, portfolio history, transaction history, crew rankings, and member portfolio views
- Separate trading flows for stocks, Pokémon cards, and sports cards, including search/detail pages and buy/sell actions
- Market data integrations for Alpaca stocks, CardSight sports cards, and the RapidAPI Pokémon card service
- Cardmarket price metrics, Pokémon one-year price history, currency conversion to USD, and per-holding recorded value history
- Idempotent starting balance allocation; retrying never resets an existing balance
- Weekly GitHub Actions valuation workflow for Pokémon, stocks, sports cards, and portfolio snapshots
- Local Dolt/MySQL-compatible ledger for development and Aiven MySQL for the production ledger

The portfolio history chart is based on trade dates and recorded market values. It includes the crew’s configured starting balance and does not manufacture performance data for new players.

## Data model

Supabase stores names, contact identities (in Auth), roles, crews, private membership, invitation hashes, and the initial ledger enrollment record. Invitations are consumed during signup in the same database transaction that creates the profile and membership; concurrent signups cannot exceed the use limit. A signup awaiting confirmation has already consumed a use. Auth users created without an invitation have no game access until a database owner explicitly enrolls them.

Dolt stores only random public player IDs, generated explorer nicknames, public crew IDs, cash, holdings, trades, and snapshots. Real signup names and contact details are never copied there. Portfolio values and cost basis are total cents per holding, not per-unit prices. A player currently belongs to one crew.

Only the server writes to the ledger. Dolt is used as the local MySQL-compatible database during development; never expose the local root database port publicly. Production uses an Aiven MySQL database rather than DoltHub. Deleting an account removes its private records and roster entry, but its anonymous public ledger history remains in the production database.

## Hosted setup later

1. Create Supabase and apply `supabase/schema.sql` once to a fresh database. If the original scaffold schema was already applied, use `supabase/migrations/002_accounts.sql` instead. Local CLI setup applies `001_initial.sql` then `002_accounts.sql` automatically.
2. Add the Supabase URL, public anon/publishable key, and server-only service-role key in Vercel. See `.env.example`.
3. Create the first Auth user in Supabase Studio, then bootstrap its profile in SQL:

   ```sql
   insert into public.profiles (id, first_name, last_name, role)
   values ('AUTH-USER-UUID', 'Crew', 'Leader', 'admin');
   ```

   Existing profiles can be promoted with `update public.profiles set role = 'admin' where id = 'AUTH-USER-UUID';`.

4. Create the production MySQL database in Aiven and apply `dolt/schema.sql` using its MySQL connection details. Set the server-only `DOLT_DATABASE_URL` to the Aiven connection URL. Despite the historical variable name, this is the production MySQL connection; Dolt is local-only.
5. Configure the market-data secrets used by the weekly GitHub Action: `POKEMON_API_KEY`, `OPEN_EXCHANGE_RATES_APP_ID`, `ALPACA_API_KEY`, `ALPACA_API_SECRET`, and `CARDSIGHT_API_KEY`. Also set `DOLT_DATABASE_URL` as a GitHub Secret for the updater workflow.
6. Configure Supabase Auth Site URL to the deployed app origin. For email confirmation, set the Confirm signup email template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}`. Configure Supabase Auth SMTP to use Brevo as the email provider, then enable confirmation and configure email delivery. Phone registration additionally needs phone Auth and SMS delivery configured.
7. Import this GitHub repository into Vercel using its Next.js preset. No Cloudflare/Sites runtime is required.

The app uses Supabase’s [server-side session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [password authentication](https://supabase.com/docs/guides/auth/passwords). Production database hosting is provided by Aiven MySQL; local development uses Dolt’s MySQL-compatible server.

## Basic checks

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
```

The weekly market-value workflow can also be run manually from GitHub Actions. No extensive automated test suite is included; local services and the browser walkthrough above are the current development workflow.
