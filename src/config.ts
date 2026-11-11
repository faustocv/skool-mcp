export interface SkoolConfig {
  cookies: string;
  defaultCommunity: string;
  baseUrl: string;
}

let cached: SkoolConfig | null = null;

export async function loadConfig(env?: any): Promise<SkoolConfig> {
  if (cached) return cached;

  let parsed: Partial<SkoolConfig> = {};
  
  // Only attempt to read from filesystem if not running on Cloudflare Workers
  const isCloudflare = typeof (globalThis as any).caches !== "undefined" && typeof (globalThis as any).WebSocketPair !== "undefined";
  
  if (!isCloudflare) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { homedir } = await import("node:os");
      
      const CONFIG_PATH = join(homedir(), ".config", "skool-mcp", "config.json");
      const raw = await readFile(CONFIG_PATH, "utf-8");
      parsed = JSON.parse(raw);
    } catch (err) {
      // Ignore ENOENT, we might have env vars
    }
  }

  // Fallback to global process.env or injected env
  const globalEnv = (typeof process !== "undefined" ? process.env : env) || {};
  
  let cookies = globalEnv.SKOOL_COOKIES ?? parsed.cookies ?? "";
  
  // Defensive normalization if Vault injected with colon/quotes instead of equals
  if (cookies.startsWith('auth_token:"') && cookies.endsWith('"')) {
    cookies = cookies.replace('auth_token:"', 'auth_token=').slice(0, -1);
  }

  const defaultCommunity = globalEnv.SKOOL_DEFAULT_COMMUNITY ?? parsed.defaultCommunity ?? "";
  const baseUrl = globalEnv.SKOOL_BASE_URL ?? parsed.baseUrl ?? "https://www.skool.com";

  if (!cookies) {
    throw new Error("Skool cookies not provided. Set SKOOL_COOKIES env var or add it to config.json.");
  }
  if (!defaultCommunity) {
    throw new Error("Skool defaultCommunity not provided. Set SKOOL_DEFAULT_COMMUNITY env var or add it to config.json.");
  }

  cached = { cookies, defaultCommunity, baseUrl };
  return cached;
}
