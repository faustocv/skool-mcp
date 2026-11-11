import { setupServer } from "./index.js";
import { createMcpHandler } from "agents/mcp/server";

export default {
  fetch(request: Request, env: any, ctx: any) {
    // Inject Cloudflare env into process.env so tools don't break
    if (typeof process === "undefined") {
      (globalThis as any).process = { env: {} };
    }
    Object.assign(process.env, env);

    return createMcpHandler(() => setupServer() as any)(request, env, ctx);
  }
};
