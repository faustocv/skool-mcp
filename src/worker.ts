import { setupServer } from "./index.js";
import { configContext } from "./config.js";
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

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", version: "0.1.0" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return new Response("Unauthorized: Missing Authorization header", { status: 401 });
    }

    const contextConfig = { cookies: authHeader };

    return configContext.run(contextConfig, () => {
      return createMcpHandler(() => setupServer() as any)(request, env, ctx);
    });
  }
};
