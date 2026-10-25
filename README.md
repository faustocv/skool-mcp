# Skool MCP Server

An MCP (Model Context Protocol) server for interacting with Skool.com communities.

## Overview
Skool doesn't have a public API, so this MCP uses authenticated HTTP requests 
to Skool's internal API endpoints (reverse-engineered from the web app).

## Setup

### 1. Install & Build

```bash
cd /mnt/c/projects/skool-mcp   # or wherever you cloned it
npm install
npm run build
```

### 2. Configure Skool Auth

You can configure the server using either a JSON file or environment variables.

**Option A: Environment Variables (Recommended for Docker)**
- `SKOOL_COOKIES`: Your Skool session cookies (`auth_token=YOUR_JWT_HERE`)
- `SKOOL_DEFAULT_COMMUNITY`: Default community handle (e.g. `ai-agent-academy-6994`)
- `SKOOL_BASE_URL`: (Optional) Base URL, defaults to `https://www.skool.com`

**Option B: Config File**
Create `~/.config/skool-mcp/config.json`:

```json
{
  "cookies": "your-skool-session-cookies-here",
  "defaultCommunity": "ai-agent-academy-6994",
  "baseUrl": "https://www.skool.com"
}
```

**Getting cookies:** Open Skool in Chrome → DevTools → Application → Cookies → copy the `auth_token` value. The `cookies` field should be: `auth_token=YOUR_JWT_HERE`

### 3. Docker (Optional but recommended)

You can run this MCP server via Docker.

```bash
docker build -t skool-mcp .
```

**Running via stdio (for Claude Desktop):**

```json
{
  "mcpServers": {
    "skool": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SKOOL_COOKIES=auth_token=...",
        "-e",
        "SKOOL_DEFAULT_COMMUNITY=your-community",
        "skool-mcp"
      ]
    }
  }
}
```

**Running via HTTP (Streamable HTTP):**

To expose the server over HTTP instead of stdio, provide the `PORT` environment variable:

```bash
docker run -d -p 3000:3000 \
  -e PORT=3000 \
  -e SKOOL_COOKIES="auth_token=YOUR_JWT_HERE" \
  -e SKOOL_DEFAULT_COMMUNITY="your-community" \
  skool-mcp
```
The server is fully compatible with the modern **Streamable HTTP** MCP transport protocol. It will accept connections on `http://localhost:3000/sse` (and `http://localhost:3000/mcp` as an alias).
You can check if the server is healthy by visiting the healthcheck endpoint: `http://localhost:3000/health`.

### 4. Configure Claude Code

Add to your `.mcp.json` (in your project root or `~/.claude/.mcp.json` for global):

```json
{
  "mcpServers": {
    "skool": {
      "command": "node",
      "args": ["/path/to/skool-mcp/dist/index.js"],
      "env": {
        "SKOOL_COOKIES": "auth_token=...",
        "SKOOL_DEFAULT_COMMUNITY": "your-community"
      }
    }
  }
}
```

### 4. Configure mcporter (OpenClaw)

```bash
mcporter add skool --command "node /mnt/c/projects/skool-mcp/dist/index.js" --transport stdio
```

Then call tools via:
```bash
mcporter call skool "skool.request" method="GET" path="/api/v1/..."
```

## Authentication

Uses session cookies from an authenticated Skool session. The `auth_token` JWT is httpOnly and long-lived (expires ~1 year).

## Tools

### Discovery
- `skool.request` — Make arbitrary authenticated requests to Skool (for API exploration)

### Community
- `skool.community.info` — Get community details (name, description, member count, settings)

### Members
- `skool.members.list` — List members of a community
- `skool.members.pending` — List pending membership requests
- `skool.members.approve` — Approve a pending member
- `skool.members.reject` — Reject a pending member

### Posts
- `skool.posts.list` — List posts in a community (with category filter, pagination)
- `skool.posts.get` — Get a specific post with comments
- `skool.posts.create` — Create a new post
- `skool.posts.comment` — Comment on a post

### Classroom
- `skool.courses.list` — List courses
- `skool.lessons.list` — List lessons in a course

### Notifications
- `skool.notifications` — Get recent notifications

## API Notes

- **Read operations** use Next.js data routes (`/_next/data/{buildId}/...`). The `buildId` is fetched dynamically.
- **Write operations** use `api2.skool.com` REST endpoints.
- A `User-Agent` header is required (CloudFront blocks bare requests with 403).
- See `API-DISCOVERY.md` for detailed endpoint documentation and response shapes.
