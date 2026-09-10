#!/usr/bin/env node
/**
 * Smoke test: validates the MCP server starts, lists tools/resources, and
 * exercises catalog tools without requiring live PCO credentials.
 *
 * If credentials are present, optionally probes GET /current/v2/me.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", path.join(root, "src/index.ts")],
    cwd: root,
    env: {
      ...process.env,
      // Ensure smoke works without credentials; leave real env intact if set.
    },
    stderr: "pipe",
  });

  const client = new Client({ name: "pc-mcp-smoke", version: "1.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  const resources = await client.listResources();

  const requiredTools = [
    "pco_list_products",
    "pco_list_endpoints",
    "pco_request",
    "pco_get_me",
    "people_list",
    "services_list_plans",
    "giving_list_donations",
    "groups_list",
    "checkins_list_events",
    "calendar_list_events",
    "publishing_list_channels",
    "registrations_list",
    "webhooks_list_subscriptions",
  ];

  const toolNames = new Set(tools.tools.map((t) => t.name));
  const missing = requiredTools.filter((name) => !toolNames.has(name));
  if (missing.length > 0) {
    throw new Error(`Missing expected tools: ${missing.join(", ")}`);
  }

  const productsResult = await client.callTool({ name: "pco_list_products", arguments: {} });
  const productsText = JSON.stringify(productsResult);
  if (!productsText.includes("people") || !productsText.includes("services")) {
    throw new Error("pco_list_products did not return expected products");
  }

  const endpointsResult = await client.callTool({
    name: "pco_list_endpoints",
    arguments: { product: "people", collection_only: true, limit: 5 },
  });
  const endpointsText = JSON.stringify(endpointsResult);
  if (!endpointsText.includes("/people")) {
    throw new Error("pco_list_endpoints did not return people collection paths");
  }

  if (process.env.PCO_ACCESS_TOKEN || (process.env.PCO_APP_ID && process.env.PCO_SECRET)) {
    const me = await client.callTool({
      name: "pco_get_me",
      arguments: { product: "current" },
    });
    const meText = JSON.stringify(me);
    if (!meText.includes('"status"')) {
      throw new Error("Live pco_get_me response missing status");
    }
    console.log("Live credential probe completed.");
  } else {
    console.log("No credentials set; skipped live API probe.");
  }

  console.log(
    `Smoke OK: ${tools.tools.length} tools, ${resources.resources.length} resources listed.`,
  );

  await client.close();
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
