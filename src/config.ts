import { AsyncLocalStorage } from "node:async_hooks";

export interface SkoolConfig {
  cookies: string;
  defaultCommunity: string;
  baseUrl: string;
}

export const configContext = new AsyncLocalStorage<Partial<SkoolConfig>>();

let fsConfigCache: Partial<SkoolConfig> | null = null;

export async function loadConfig(env?: any): Promise<SkoolConfig> {
  const context = configContext.getStore() || {};

  let parsed: Partial<SkoolConfig> = {};
  
  // Only attempt to read from filesystem if not running on Cloudflare Workers
  const isCloudflare = typeof (globalThis as any).caches !== "undefined" && typeof (globalThis as any).WebSocketPair !== "undefined";
  
  if (!isCloudflare) {
    if (fsConfigCache) {
      parsed = fsConfigCache;
    } else {
      try {
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const { homedir } = await import("node:os");
        
        const CONFIG_PATH = join(homedir(), ".config", "skool-mcp", "config.json");
        const raw = await readFile(CONFIG_PATH, "utf-8");
        parsed = JSON.parse(raw);
        fsConfigCache = parsed;
      } catch (err) {
        fsConfigCache = {}; // Cache empty to avoid retrying on ENOENT
      }
    }
  }

  // Fallback to global process.env or injected env
  const globalEnv = (typeof process !== "undefined" ? process.env : env) || {};
  const cfEnv = (globalThis as any).CF_ENV || {};
  
  let cookies = context.cookies ?? env?.SKOOL_COOKIES ?? cfEnv.SKOOL_COOKIES ?? globalEnv.SKOOL_COOKIES ?? parsed.cookies ?? "";

  if (cookies.startsWith('Bearer ')) {
    cookies = cookies.slice('Bearer '.length);
  }

  // Defensive normalization if injected with colon instead of equals
  if (cookies.startsWith('auth_token:')) {
    cookies = cookies.replace('auth_token:', 'auth_token=');
  }
  if (cookies.startsWith('auth_token="') && cookies.endsWith('"')) {
    cookies = cookies.replace('auth_token="', 'auth_token=').slice(0, -1);
  }
  if (cookies.startsWith('auth_token=') && cookies.endsWith('"')) {
    cookies = cookies.slice(0, -1);
  }

  if (cookies && !cookies.startsWith('auth_token=')) {
    cookies = `auth_token=${cookies}`;
  }

  const defaultCommunity = env?.SKOOL_DEFAULT_COMMUNITY ?? cfEnv.SKOOL_DEFAULT_COMMUNITY ?? globalEnv.SKOOL_DEFAULT_COMMUNITY ?? parsed.defaultCommunity ?? "";
  const baseUrl = env?.SKOOL_BASE_URL ?? cfEnv.SKOOL_BASE_URL ?? globalEnv.SKOOL_BASE_URL ?? parsed.baseUrl ?? "https://www.skool.com";

  if (!cookies) {
    throw new Error("Skool cookies not provided. Set SKOOL_COOKIES env var, provide Authorization header, or add it to config.json.");
  }
  if (!defaultCommunity) {
    throw new Error("Skool defaultCommunity not provided. Set SKOOL_DEFAULT_COMMUNITY env var or add it to config.json.");
  }

  return { cookies, defaultCommunity, baseUrl };
}
