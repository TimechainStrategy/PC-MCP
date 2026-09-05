import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PcoClient, HttpMethod } from "../client/pco-client.js";
import { filterEndpoints, listProductsSummary, PRODUCT_IDS } from "../catalog/products.js";
import {
  formatToolResult,
  jsonApiQuerySchema,
  productGet,
  requireId,
  toQueryParams,
  type JsonApiQueryInput,
} from "./helpers.js";

const productIdSchema = z
  .enum([
    "people",
    "services",
    "check-ins",
    "giving",
    "groups",
    "calendar",
    "publishing",
    "registrations",
    "webhooks",
    "api",
    "current",
  ])
  .describe("Planning Center product id");

function apiPathFor(product: string): string {
  const map: Record<string, string> = {
    people: "people",
    services: "services",
    "check-ins": "check-ins",
    giving: "giving",
    groups: "groups",
    calendar: "calendar",
    publishing: "publishing",
    registrations: "registrations",
    webhooks: "webhooks",
    api: "api",
    current: "current",
  };
  return map[product] ?? product;
}

export function registerCoreTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "pco_list_products",
    {
      title: "List Planning Center products",
      description:
        "List all Planning Center API products covered by this MCP server, including OAuth scopes, docs URLs, OpenAPI URLs, and endpoint counts derived from official OpenAPI specs.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              baseUrl: "https://api.planningcenteronline.com",
              auth: client.authMode(),
              credentialsConfigured: client.hasCredentials(),
              products: listProductsSummary(),
              notes: [
                "Use pco_list_endpoints to browse paths for a product.",
                "Use first-class tools for common workflows, or pco_request for any documented path.",
                "Docs: https://api.planningcenteronline.com/docs/",
              ],
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "pco_list_endpoints",
    {
      title: "List endpoints for a PCO product",
      description:
        "Browse documented REST endpoints for a Planning Center product from the published OpenAPI description. Filter by HTTP method, search text, or collection-only paths.",
      inputSchema: {
        product: productIdSchema,
        method: z
          .enum(["GET", "POST", "PATCH", "PUT", "DELETE"])
          .optional()
          .describe("Filter by HTTP method"),
        search: z
          .string()
          .optional()
          .describe("Case-insensitive search across path, method, and summary"),
        collection_only: z
          .boolean()
          .optional()
          .describe("If true, only return paths without {path_params}"),
        limit: z.number().int().min(1).max(500).optional().describe("Max results (default 100)"),
        offset: z.number().int().min(0).optional().describe("Result offset (default 0)"),
      },
    },
    async ({ product, method, search, collection_only, limit, offset }) => {
      const result = filterEndpoints(product, {
        method,
        search,
        collectionOnly: collection_only,
        limit,
        offset,
      });
      if (!result) {
        return {
          content: [{ type: "text", text: `Unknown product: ${product}. Known: ${PRODUCT_IDS.join(", ")}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                product: {
                  id: product,
                  title: result.product.title,
                  apiPath: result.product.apiPath,
                  version: result.product.version,
                  docs: result.product.docs,
                },
                total: result.total,
                returned: result.endpoints.length,
                offset: offset ?? 0,
                endpoints: result.endpoints.map((ep) => ({
                  ...ep,
                  fullPath: `/${result.product.apiPath}/v2${ep.path === "" ? "" : ep.path}`,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "pco_request",
    {
      title: "Raw Planning Center API request",
      description:
        "Escape hatch for any Planning Center JSON:API endpoint. Pass a path like /people/v2/people or people/v2/people, optional query (include, filter, order, where, fields, per_page, offset), and optional JSON:API body for writes. Prefer first-class tools for common workflows.",
      inputSchema: {
        method: z
          .enum(["GET", "POST", "PATCH", "PUT", "DELETE"])
          .default("GET")
          .describe("HTTP method"),
        path: z
          .string()
          .describe(
            "API path including product + version, e.g. /people/v2/people or /services/v2/service_types/1/plans",
          ),
        query: z
          .record(z.unknown())
          .optional()
          .describe(
            "Query parameters object. Supports nested where/fields objects which are expanded to where[attr] and fields[Type].",
          ),
        body: z
          .unknown()
          .optional()
          .describe('JSON:API request document for writes, typically {"data":{"type":"...","attributes":{...}}}'),
        api_version: z
          .string()
          .optional()
          .describe("Optional X-PCO-API-Version override (YYYY-MM-DD or LATEST)"),
        retry_on_rate_limit: z
          .boolean()
          .optional()
          .describe("Retry on HTTP 429 using Retry-After (default: true for GET, false otherwise unless set)"),
      },
    },
    async ({ method, path, query, body, api_version, retry_on_rate_limit }) => {
      const result = await client.request({
        method: method as HttpMethod,
        path,
        query,
        body,
        apiVersion: api_version,
        retryOnRateLimit: retry_on_rate_limit,
      });
      return formatToolResult(result);
    },
  );

  server.registerTool(
    "pco_get_me",
    {
      title: "Get current Planning Center user",
      description:
        "Fetch the authenticated user. Use product=current for /current/v2/me (no OAuth scope required), or a product id for /{product}/v2/me which enforces that product's permissions.",
      inputSchema: {
        product: productIdSchema
          .default("current")
          .describe("Product whose /me endpoint to call (default: current)"),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const product = args.product ?? "current";
      const result = await productGet(client, apiPathFor(product), "/me", args, args.api_version);
      return formatToolResult(result);
    },
  );
}

export function registerPeopleTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "people_list",
    {
      title: "List people",
      description:
        "List people from Planning Center People (`GET /people/v2/people`). Supports where filters (first_name, last_name, search_name, search_phone_number, search_phone_number_e164, etc.), include, order, and pagination.",
      inputSchema: {
        ...jsonApiQuerySchema,
        search_name: z
          .string()
          .optional()
          .describe("Convenience alias for where[search_name] (partial name search)"),
        search_phone_number: z
          .string()
          .optional()
          .describe("Convenience alias for where[search_phone_number]"),
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const where = { ...(args.where ?? {}) };
      if (args.search_name) where.search_name = args.search_name;
      if (args.search_phone_number) where.search_phone_number = args.search_phone_number;
      const result = await productGet(
        client,
        "people",
        "/people",
        { ...args, where },
        args.api_version,
      );
      return formatToolResult(result);
    },
  );

  server.registerTool(
    "people_get",
    {
      title: "Get a person",
      description: "Get a single person by id (`GET /people/v2/people/{id}`).",
      inputSchema: {
        person_id: z.string().describe("Person id"),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const id = requireId(args.person_id, "person_id");
      const result = await productGet(client, "people", `/people/${id}`, args, args.api_version);
      return formatToolResult(result);
    },
  );

  server.registerTool(
    "people_search",
    {
      title: "Search people by name or email",
      description:
        "Search people using common where filters. Provide any combination of name, email, phone, or status. Uses GET /people/v2/people.",
      inputSchema: {
        name: z.string().optional().describe("Maps to where[search_name]"),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z
          .string()
          .optional()
          .describe("Requires include=emails and where[emails][address]=..."),
        phone: z.string().optional().describe("Maps to where[search_phone_number]"),
        status: z.string().optional().describe('e.g. "active" or "inactive"'),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const where: Record<string, unknown> = { ...(args.where ?? {}) };
      if (args.name) where.search_name = args.name;
      if (args.first_name) where.first_name = args.first_name;
      if (args.last_name) where.last_name = args.last_name;
      if (args.phone) where.search_phone_number = args.phone;
      if (args.status) where.status = args.status;

      let include = args.include;
      if (args.email) {
        where.emails = { ...(typeof where.emails === "object" && where.emails ? where.emails : {}), address: args.email };
        if (!include) include = "emails";
        else if (typeof include === "string" && !include.includes("emails")) include = `${include},emails`;
        else if (Array.isArray(include) && !include.includes("emails")) include = [...include, "emails"];
      }

      const result = await client.productRequest("people", "/people", {
        method: "GET",
        query: toQueryParams({ ...args, where: where as JsonApiQueryInput["where"], include }),
        apiVersion: args.api_version,
      });
      return formatToolResult(result);
    },
  );

  server.registerTool(
    "people_list_lists",
    {
      title: "List People lists",
      description: "List Lists in People (`GET /people/v2/lists`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) => formatToolResult(await productGet(client, "people", "/lists", args, args.api_version)),
  );

  server.registerTool(
    "people_list_list_results",
    {
      title: "List results for a People list",
      description: "List ListResult rows for a List (`GET /people/v2/lists/{list_id}/list_results`).",
      inputSchema: {
        list_id: z.string(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const listId = requireId(args.list_id, "list_id");
      return formatToolResult(
        await productGet(client, "people", `/lists/${listId}/list_results`, args, args.api_version),
      );
    },
  );

  server.registerTool(
    "people_list_households",
    {
      title: "List households",
      description: "List households (`GET /people/v2/households`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "people", "/households", args, args.api_version)),
  );

  server.registerTool(
    "people_list_campuses",
    {
      title: "List campuses",
      description: "List campuses (`GET /people/v2/campuses`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "people", "/campuses", args, args.api_version)),
  );

  server.registerTool(
    "people_list_workflows",
    {
      title: "List workflows",
      description: "List workflows (`GET /people/v2/workflows`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "people", "/workflows", args, args.api_version)),
  );
}
