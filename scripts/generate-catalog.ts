/**
 * Regenerates src/catalog/endpoints-catalog.json from live Planning Center OpenAPI specs.
 *
 * Usage: npm run generate:catalog
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PRODUCTS: Record<
  string,
  { apiPath: string; version: string; scope: string | null; docs: string }
> = {
  people: {
    apiPath: "people",
    version: "2026-06-04",
    scope: "people",
    docs: "https://api.planningcenteronline.com/docs/apps/people",
  },
  services: {
    apiPath: "services",
    version: "2018-11-01",
    scope: "services",
    docs: "https://api.planningcenteronline.com/docs/apps/services",
  },
  "check-ins": {
    apiPath: "check-ins",
    version: "2025-05-28",
    scope: "check_ins",
    docs: "https://api.planningcenteronline.com/docs/apps/check-ins",
  },
  giving: {
    apiPath: "giving",
    version: "2019-10-18",
    scope: "giving",
    docs: "https://api.planningcenteronline.com/docs/apps/giving",
  },
  groups: {
    apiPath: "groups",
    version: "2023-07-10",
    scope: "groups",
    docs: "https://api.planningcenteronline.com/docs/apps/groups",
  },
  calendar: {
    apiPath: "calendar",
    version: "2026-06-22",
    scope: "calendar",
    docs: "https://api.planningcenteronline.com/docs/apps/calendar",
  },
  publishing: {
    apiPath: "publishing",
    version: "2024-03-25",
    scope: "publishing",
    docs: "https://api.planningcenteronline.com/docs/apps/publishing",
  },
  registrations: {
    apiPath: "registrations",
    version: "2025-05-01",
    scope: "registrations",
    docs: "https://api.planningcenteronline.com/docs/apps/registrations",
  },
  webhooks: {
    apiPath: "webhooks",
    version: "2022-10-20",
    scope: null,
    docs: "https://api.planningcenteronline.com/docs/apps/webhooks",
  },
  api: {
    apiPath: "api",
    version: "2025-09-30",
    scope: "api",
    docs: "https://api.planningcenteronline.com/docs/apps/api",
  },
  current: {
    apiPath: "current",
    version: "2018-08-01",
    scope: null,
    docs: "https://api.planningcenteronline.com/docs/apps/current",
  },
};

interface OpenApiDoc {
  info?: { title?: string; version?: string };
  paths?: Record<string, Record<string, { summary?: string; operationId?: string }>>;
}

async function fetchSpec(apiPath: string, version: string): Promise<OpenApiDoc> {
  const url = `https://api.planningcenteronline.com/${apiPath}/v2/open_api/${version}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PC-MCP-catalog-generator (https://github.com/TimechainStrategy/PC-MCP)",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as OpenApiDoc;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}

async function main(): Promise<void> {
  const catalog: {
    baseUrl: string;
    generatedAt: string;
    products: Record<string, unknown>;
  } = {
    baseUrl: "https://api.planningcenteronline.com",
    generatedAt: new Date().toISOString(),
    products: {},
  };

  for (const [id, meta] of Object.entries(PRODUCTS)) {
    process.stderr.write(`Fetching ${id}...\n`);
    const spec = await fetchSpec(meta.apiPath, meta.version);
    const endpoints: Array<{ method: string; path: string; summary: string }> = [];
    for (const [p, ops] of Object.entries(spec.paths ?? {})) {
      for (const [method, op] of Object.entries(ops)) {
        if (!["get", "post", "patch", "put", "delete"].includes(method)) continue;
        let summary = stripHtml(op.summary || op.operationId || "");
        if (summary.length > 160) summary = `${summary.slice(0, 157)}...`;
        endpoints.push({
          method: method.toUpperCase(),
          path: p.startsWith("/") ? p : `/${p}`,
          summary,
        });
      }
    }
    endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

    catalog.products[id] = {
      ...meta,
      title: (spec.info?.title ?? id).trim(),
      endpointCount: endpoints.length,
      endpoints,
    };
    process.stderr.write(`  ${endpoints.length} operations\n`);
  }

  const outPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/catalog/endpoints-catalog.json",
  );
  writeFileSync(outPath, `${JSON.stringify(catalog)}\n`);
  process.stderr.write(`Wrote ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
