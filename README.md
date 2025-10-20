# Akindo Wave Hacks Dashboard

A Next.js dashboard for browsing active Akindo Wave Hacks, inspecting real-time timelines, and exploring judging details. The app also exposes a Model Context Protocol (MCP) endpoint so external tooling can connect to the same dataset.

## Features

- **Wave Hack listings** – Fetches active hacks from Akindo and surfaces core details such as status, prize pool, timelines, and token information.
- **Live countdowns** – Displays submission and judging deadlines with color-coded progress bars and auto-updating timers.
- **Detail modal** – Presents full hack descriptions, community links, and criteria with markdown rendering via `react-markdown` and `remark-gfm`.
- **MCP endpoint helper** – Highlights the `<domain>/mcp` endpoint with a one-click copy action to integrate external MCP-compatible agents.

## Tech Stack

- [Next.js App Router](https://nextjs.org/docs/app) with client components
- TypeScript & Tailwind CSS utility classes
- `react-markdown` with GitHub-flavored markdown support
- Akindo data fetched through internal API routes (`/api/akindo-data`, `/api/wave-hack/[id]`)

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (preferred package manager)

### Installation

```bash
pnpm install
```

### Running the app

```bash
pnpm dev
```

The development server defaults to [http://localhost:3000](http://localhost:3000). If you need to use a different port, append `--port <PORT>` to the command (for example, `pnpm dev --port 3100`).

### Available scripts

```bash
pnpm dev      # start the development server
pnpm build    # build the production bundle
pnpm start    # run the production server
pnpm lint     # run Next.js linting
```

## Connecting via MCP

The application hosts an MCP endpoint at:

```
<your-domain>/mcp
```

When running locally, this will typically be `http://localhost:3000/mcp` (or whichever port you configured while starting the dev server). Use this endpoint to register the data source with MCP-compatible tools.

## Project Structure Highlights

- `src/app/page.tsx` – Main dashboard page that renders the Wave Hacks grid, modal, and MCP helper.
- `src/pages/api/akindo-data.ts` – Returns current Wave Hack listings (single page or paginated).
- `src/pages/api/wave-hack/[id].ts` – Fetches detailed information for a specific hack.

## Cloudflare environment setup

- The `baseURL` helper (`src/config/baseUrl.ts:1`) expects the Vercel-style variables `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_URL` so that `next.config.ts:4` can set `assetPrefix` correctly.
- Use the helper script to populate these values in Cloudflare via Wrangler: `fish scripts/configure-cloudflare-base-url.fish <production-domain> [environment]`. Example: `fish scripts/configure-cloudflare-base-url.fish app.example.com production`.
- Wrangler will prompt before overwriting existing secrets—reply with `y` to confirm. The script pipes the values so you do not need to type them manually.
- For preview or staging environments, rerun the script with a different Worker environment name (for example, `fish scripts/configure-cloudflare-base-url.fish preview.example.workers.dev preview`). The script will switch to `VERCEL_BRANCH_URL` when the environment is not `production`.
- After updating the secrets, redeploy with your usual workflow (`pnpm run deploy`) so the new asset prefix is embedded in the build.

## Contributing

1. Fork the repo and create a feature branch.
2. Run `pnpm lint` before submitting changes.
3. Open a pull request describing the update and any manual verification steps.

## License

This project is proprietary to the Akindo Wave Hacks team. Reach out to the maintainers for usage permissions.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
