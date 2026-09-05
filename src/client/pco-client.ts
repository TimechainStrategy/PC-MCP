import type {
  JsonApiDocument,
  JsonApiErrorObject,
  PcoRateLimitInfo,
  PcoRequestResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.planningcenteronline.com";
const DEFAULT_USER_AGENT = "PC-MCP (https://github.com/TimechainStrategy/PC-MCP)";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface PcoClientConfig {
  /** Personal Access Token application id (Basic auth username). */
  appId?: string;
  /** Personal Access Token secret (Basic auth password). */
  secret?: string;
  /** OAuth bearer access token. Takes precedence over PAT when set. */
  accessToken?: string;
  baseUrl?: string;
  /** Default `X-PCO-API-Version` header (YYYY-MM-DD or LATEST). */
  apiVersion?: string;
  userAgent?: string;
  timeoutMs?: number;
  /** Max retries on HTTP 429. Set 0 to disable automatic retries. */
  maxRetries?: number;
}

export interface PcoRequestOptions {
  method?: HttpMethod;
  /** Path beginning with `/product/v2/...` or `/product/v2/...` relative to base URL. */
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  /** Override `X-PCO-API-Version` for this request. */
  apiVersion?: string;
  /** Skip automatic 429 retries for non-idempotent calls if desired. */
  retryOnRateLimit?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRateLimit(headers: Headers): PcoRateLimitInfo {
  const parseIntHeader = (name: string): number | null => {
    const raw = headers.get(name);
    if (raw == null || raw === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };

  return {
    limit: parseIntHeader("X-PCO-API-Request-Rate-Limit"),
    count: parseIntHeader("X-PCO-API-Request-Rate-Count"),
    period: headers.get("X-PCO-API-Request-Rate-Period"),
    retryAfterSeconds: parseIntHeader("Retry-After"),
  };
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * Serialize query params in a PCO/JSON:API-friendly way.
 * Arrays become comma-separated (include, filter, order, fields).
 * Nested `where` objects become `where[attr]=value` / `where[attr][op]=value`.
 * Nested `fields` objects become `fields[Type]=a,b`.
 */
export function buildQueryString(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();

  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      params.set(key, value.map(String).join(","));
      return;
    }
    if (typeof value === "object") {
      for (const [childKey, childVal] of Object.entries(value as Record<string, unknown>)) {
        if (childVal !== null && typeof childVal === "object" && !Array.isArray(childVal)) {
          for (const [op, opVal] of Object.entries(childVal as Record<string, unknown>)) {
            append(`${key}[${childKey}][${op}]`, opVal);
          }
        } else {
          append(`${key}[${childKey}]`, childVal);
        }
      }
      return;
    }
    params.set(key, String(value));
  };

  for (const [key, value] of Object.entries(query)) {
    append(key, value);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error("path is required");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function extractErrorHint(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const errors = (body as JsonApiDocument).errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0];
  return first?.code ?? first?.title ?? first?.detail;
}

export class PcoClient {
  private readonly appId?: string;
  private readonly secret?: string;
  private readonly accessToken?: string;
  private readonly baseUrl: string;
  private readonly apiVersion?: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: PcoClientConfig = {}) {
    this.appId = config.appId ?? process.env.PCO_APP_ID;
    this.secret = config.secret ?? process.env.PCO_SECRET;
    this.accessToken = config.accessToken ?? process.env.PCO_ACCESS_TOKEN;
    this.baseUrl = (config.baseUrl ?? process.env.PCO_BASE_URL ?? DEFAULT_BASE_URL).replace(
      /\/$/,
      "",
    );
    this.apiVersion = config.apiVersion ?? process.env.PCO_API_VERSION;
    this.userAgent = config.userAgent ?? process.env.PCO_USER_AGENT ?? DEFAULT_USER_AGENT;
    this.timeoutMs =
      config.timeoutMs ??
      (process.env.PCO_TIMEOUT_MS ? Number.parseInt(process.env.PCO_TIMEOUT_MS, 10) : DEFAULT_TIMEOUT_MS);
    this.maxRetries =
      config.maxRetries ??
      (process.env.PCO_MAX_RETRIES
        ? Number.parseInt(process.env.PCO_MAX_RETRIES, 10)
        : DEFAULT_MAX_RETRIES);
  }

  /** True when either OAuth bearer or PAT credentials are configured. */
  hasCredentials(): boolean {
    if (this.accessToken && this.accessToken.length > 0) return true;
    return Boolean(this.appId && this.secret);
  }

  authMode(): "oauth" | "pat" | "none" {
    if (this.accessToken) return "oauth";
    if (this.appId && this.secret) return "pat";
    return "none";
  }

  private authorizationHeader(): string {
    if (this.accessToken) {
      return `Bearer ${this.accessToken}`;
    }
    if (this.appId && this.secret) {
      const token = Buffer.from(`${this.appId}:${this.secret}`, "utf8").toString("base64");
      return `Basic ${token}`;
    }
    throw new Error(
      "Missing Planning Center credentials. Set PCO_ACCESS_TOKEN or both PCO_APP_ID and PCO_SECRET.",
    );
  }

  async request<T = JsonApiDocument>(options: PcoRequestOptions): Promise<PcoRequestResult<T>> {
    const method = options.method ?? "GET";
    const path = normalizePath(options.path);
    const query = buildQueryString(options.query);
    const url = /^https?:\/\//i.test(path) ? `${path}${query}` : `${this.baseUrl}${path}${query}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.api+json",
      Authorization: this.authorizationHeader(),
      "User-Agent": this.userAgent,
    };

    const version = options.apiVersion ?? this.apiVersion;
    if (version) {
      headers["X-PCO-API-Version"] = version;
    }

    let bodyText: string | undefined;
    if (options.body !== undefined && options.body !== null) {
      headers["Content-Type"] = "application/vnd.api+json";
      bodyText = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const retryOnRateLimit = options.retryOnRateLimit ?? method === "GET";
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body: bodyText,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          status: 0,
          statusText: "Network Error",
          url,
          method,
          rateLimit: { limit: null, count: null, period: null, retryAfterSeconds: null },
          headers: {},
          body: null,
          error: { message },
        };
      } finally {
        clearTimeout(timer);
      }

      const rateLimit = readRateLimit(response.headers);
      const responseHeaders = headersToObject(response.headers);
      const rawText = await response.text();
      let parsed: unknown = null;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText) as unknown;
        } catch {
          parsed = rawText;
        }
      }

      if (response.status === 429 && retryOnRateLimit && attempt < this.maxRetries) {
        const delaySec = rateLimit.retryAfterSeconds ?? 1;
        await sleep(Math.max(delaySec, 1) * 1000);
        attempt += 1;
        continue;
      }

      const ok = response.ok;
      const errors =
        parsed && typeof parsed === "object" && Array.isArray((parsed as JsonApiDocument).errors)
          ? ((parsed as JsonApiDocument).errors as JsonApiErrorObject[])
          : undefined;

      const result: PcoRequestResult<T> = {
        ok,
        status: response.status,
        statusText: response.statusText,
        url,
        method,
        rateLimit,
        headers: responseHeaders,
        body: (parsed as T) ?? null,
      };

      if (!ok) {
        result.error = {
          message:
            errors?.[0]?.detail ??
            errors?.[0]?.title ??
            (response.statusText || "Request failed"),
          hint: extractErrorHint(parsed),
          errors,
        };
      }

      return result;
    }
  }

  /** Convenience wrapper that prefixes `/{product}/v2`. */
  async productRequest<T = JsonApiDocument>(
    productApiPath: string,
    resourcePath: string,
    options: Omit<PcoRequestOptions, "path"> = {},
  ): Promise<PcoRequestResult<T>> {
    const cleanProduct = productApiPath.replace(/^\/+|\/+$/g, "");
    const cleanResource = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
    return this.request<T>({
      ...options,
      path: `/${cleanProduct}/v2${cleanResource}`,
    });
  }
}

export function createClientFromEnv(overrides: PcoClientConfig = {}): PcoClient {
  return new PcoClient(overrides);
}
