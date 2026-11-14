import { setupServer } from "./index.js";
import { createMcpHandler } from "agents/mcp/server";

export default {
  fetch(request: Request, env: any, ctx: any) {
    // Inject Cloudflare env into globalThis so tools can access it
    (globalThis as any).CF_ENV = env;
    
    // Also try to inject into process.env for nodejs_compat (might be read-only, but just in case)
    if (typeof process === "undefined") {
      (globalThis as any).process = { env: {} };
    }
    try {
      Object.assign(process.env, env);
    } catch (e) {
      // Ignore if read-only
    }

    return createMcpHandler(() => setupServer() as any)(request, env, ctx);
  }
};
