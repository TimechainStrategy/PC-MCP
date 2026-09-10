# PC-MCP

Production-oriented **Model Context Protocol (MCP)** server that exposes the [Planning Center Online (PCO) REST API](https://api.planningcenteronline.com/docs/) to MCP clients such as Cursor and Claude Desktop.

The server is built with Node.js, TypeScript, and the official [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk). It speaks **stdio** by default.

## Features

- **Full API reach** via a typed generic `pco_request` escape hatch (any documented path)
- **OpenAPI-backed discovery** (`pco_list_products`, `pco_list_endpoints`, MCP resources) covering **1,700+** operations across all documented products
- **First-class tools** for common workflows in People, Services, Giving, Groups, Check-Ins, Calendar, Publishing, Registrations, and Webhooks
- **Auth**: Personal Access Token (Basic) and/or OAuth bearer token
- **JSON:API** query helpers: `include`, `filter`, `order`, `where`, `fields`, `per_page`, `offset`
- Clear **HTTP status**, PCO error bodies, and **rate-limit headers** in every tool result

## Install

```bash
npm install
npm run build
```

Requires Node.js 18+.

## Authentication

Create credentials in your [Planning Center developer account](https://api.planningcenteronline.com/oauth/applications).

### Personal Access Token (recommended for local MCP)

1. Create a PAT at https://api.planningcenteronline.com/personal_access_tokens
2. Set:

```bash
export PCO_APP_ID="your_client_id"
export PCO_SECRET="your_secret"
```

Requests use HTTP Basic auth (`client_id:secret`), matching the official docs.

### OAuth bearer token

If you already have an OAuth access token:

```bash
export PCO_ACCESS_TOKEN="your_access_token"
```

When `PCO_ACCESS_TOKEN` is set it takes precedence over PAT credentials.

OAuth scopes map 1:1 to products (`people`, `services`, `check_ins`, `giving`, `groups`, `calendar`, `publishing`, `registrations`, `api`, `home`). Webhooks and `/current/v2/me` do not require a product scope.

### Optional env

| Variable | Purpose |
| --- | --- |
| `PCO_BASE_URL` | Override API host (default `https://api.planningcenteronline.com`) |
| `PCO_API_VERSION` | Default `X-PCO-API-Version` (`YYYY-MM-DD` or `LATEST`) |
| `PCO_USER_AGENT` | Required-style identifying User-Agent (a default is provided) |
| `PCO_TIMEOUT_MS` | Request timeout (default `30000`) |
| `PCO_MAX_RETRIES` | Max automatic retries on HTTP 429 for GET (default `3`) |

See [`.env.example`](./.env.example).

## Run

```bash
npm start
# or during development:
npm run dev
```

Smoke test (starts the server over stdio, lists tools, exercises catalog tools; live `/me` only if credentials are set):

```bash
npm run smoke
```

## Cursor config

On startup the server loads `.env` then `.env.local` from the package root (empty MCP `env` values do not block this). Copy `.env.example` and add a Personal Access Token so Cursor does not need secrets in `mcp.json`.

Add to your MCP settings (path varies by Cursor version), using an absolute path to this repo:

```json
{
  "mcpServers": {
    "planning-center": {
      "command": "node",
      "args": ["/absolute/path/to/PC-MCP/dist/index.js"],
      "env": {
        "PCO_APP_ID": "your_client_id",
        "PCO_SECRET": "your_secret"
      }
    }
  }
}
```

Or run via `npx tsx` against source during development:

```json
{
  "mcpServers": {
    "planning-center": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/PC-MCP/src/index.ts"],
      "env": {
        "PCO_APP_ID": "your_client_id",
        "PCO_SECRET": "your_secret"
      }
    }
  }
}
```

## Claude Desktop config

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "planning-center": {
      "command": "node",
      "args": ["/absolute/path/to/PC-MCP/dist/index.js"],
      "env": {
        "PCO_APP_ID": "your_client_id",
        "PCO_SECRET": "your_secret"
      }
    }
  }
}
```

## Tool organization

### Discovery & escape hatch

| Tool | Purpose |
| --- | --- |
| `pco_list_products` | Products, OAuth scopes, docs + OpenAPI URLs |
| `pco_list_endpoints` | Filterable endpoint catalog from official OpenAPI |
| `pco_request` | Raw HTTP to any `/product/v2/...` path |
| `pco_get_me` | Current user (`/current/v2/me` or `/{product}/v2/me`) |

### First-class product tools (examples)

- **People**: `people_list`, `people_get`, `people_search`, `people_list_lists`, `people_list_households`, …
- **Services**: `services_list_service_types`, `services_list_plans`, `services_get_plan`, `services_list_songs`, …
- **Giving**: `giving_list_donations`, `giving_list_funds`, `giving_list_batches`, …
- **Groups**: `groups_list`, `groups_get`, `groups_list_memberships`, `groups_list_events`, …
- **Check-Ins**: `checkins_list_events`, `checkins_list_check_ins`, `checkins_list_event_times`, …
- **Calendar**: `calendar_list_events`, `calendar_list_event_instances`, `calendar_list_resources`, …
- **Publishing / Registrations / Webhooks**: channel/episode/signup/subscription helpers

For obscure nested routes, use `pco_list_endpoints` then `pco_request`.

### Shared query parameters

Most list tools accept:

- `include` — sideload related resources
- `filter` — named filters
- `order` — sort (`-created_at` for descending)
- `where` — attribute filters / comparisons (`{"birthdate":{"lte":"1981-04-28"}}`)
- `fields` — sparse fieldsets (`{"Person":["first_name","last_name"]}`)
- `per_page` / `offset` — pagination (max `per_page` 100)

### Resources

- `pco://products` — product summary
- `pco://products/{product}/endpoints` — endpoint catalog for a product
- `pco://docs/overview` — links to official guides

## Error & rate-limit handling

Tool results always include:

```json
{
  "ok": false,
  "status": 429,
  "statusText": "Too Many Requests",
  "url": "...",
  "method": "GET",
  "rateLimit": {
    "limit": 100,
    "count": 118,
    "period": "20 seconds",
    "retryAfterSeconds": 19
  },
  "error": { "message": "...", "hint": "429", "errors": [/* PCO JSON:API errors */] },
  "body": { "errors": [/* ... */] }
}
```

GET requests automatically retry on `429` using `Retry-After` (configurable via `PCO_MAX_RETRIES`).

## Regenerating the endpoint catalog

The bundled catalog is generated from public OpenAPI documents such as:

`https://api.planningcenteronline.com/people/v2/open_api/2026-06-04`

```bash
npm run generate:catalog
```

## Developer docs

- Getting started: https://api.planningcenteronline.com/docs/overview/getting-started
- Authentication: https://api.planningcenteronline.com/docs/overview/authentication
- Rate limiting: https://api.planningcenteronline.com/docs/overview/rate-limiting
- JSON:API: https://api.planningcenteronline.com/docs/overview/json-api
- API reference (all products): https://api.planningcenteronline.com/docs/apps

## License

MIT — see [LICENSE](./LICENSE).
