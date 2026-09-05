import { z } from "zod";
import type { PcoClient } from "../client/pco-client.js";
import type { PcoRequestResult } from "../client/types.js";

/** Shared JSON:API query knobs accepted by most collection endpoints. */
export const jsonApiQuerySchema = {
  include: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(
      "Related resources to sideload (comma-separated string or array). Nested includes use dot notation, e.g. households.people",
    ),
  filter: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Named filter(s) supported by the endpoint (comma-separated or array)"),
  order: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("Sort field(s). Prefix with - for descending, e.g. -created_at"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Page size (1-100, default 25)"),
  offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
  where: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.record(z.union([z.string(), z.number(), z.boolean()]))]))
    .optional()
    .describe(
      'Attribute filters as an object. Equality: {"first_name":"Tim"}. Comparisons: {"birthdate":{"lte":"1981-04-28"}}. Becomes where[attr]=value.',
    ),
  fields: z
    .record(z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe(
      'Sparse fieldsets keyed by resource type, e.g. {"Person":"first_name,last_name"} or {"Person":["first_name","last_name"]}',
    ),
};

export type JsonApiQueryInput = {
  include?: string | string[];
  filter?: string | string[];
  order?: string | string[];
  per_page?: number;
  offset?: number;
  where?: Record<string, string | number | boolean | Record<string, string | number | boolean>>;
  fields?: Record<string, string | string[]>;
};

export function toQueryParams(
  input: JsonApiQueryInput & Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const query: Record<string, unknown> = { ...(extra ?? {}) };

  if (input.include !== undefined) query.include = input.include;
  if (input.filter !== undefined) query.filter = input.filter;
  if (input.order !== undefined) query.order = input.order;
  if (input.per_page !== undefined) query.per_page = input.per_page;
  if (input.offset !== undefined) query.offset = input.offset;
  if (input.where !== undefined) query.where = input.where;
  if (input.fields !== undefined) query.fields = input.fields;

  return query;
}

export function formatToolResult(result: PcoRequestResult): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const payload = {
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    method: result.method,
    url: result.url,
    rateLimit: result.rateLimit,
    error: result.error,
    body: result.body,
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: !result.ok,
  };
}

export async function productGet(
  client: PcoClient,
  productApiPath: string,
  resourcePath: string,
  query: JsonApiQueryInput & Record<string, unknown> = {},
  apiVersion?: string,
) {
  const { api_version: _ignored, ...rest } = query as Record<string, unknown>;
  return client.productRequest(productApiPath, resourcePath, {
    method: "GET",
    query: toQueryParams(rest as JsonApiQueryInput),
    apiVersion,
  });
}

export function requireId(id: string, label = "id"): string {
  const trimmed = id.trim();
  if (!trimmed) throw new Error(`${label} is required`);
  return trimmed;
}
