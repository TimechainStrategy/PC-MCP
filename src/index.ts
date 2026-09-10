#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./client/pco-client.js";
import { loadProjectEnv } from "./load-env.js";
import { createPcoMcpServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

loadProjectEnv();

async function main(): Promise<void> {
  const client = createClientFromEnv();

  if (!client.hasCredentials()) {
    // Credentials are checked at request time; warn on stderr so stdio JSON-RPC stays clean.
    console.error(
      `[${SERVER_NAME}] Warning: no credentials configured. Set PCO_APP_ID+PCO_SECRET or PCO_ACCESS_TOKEN.`,
    );
  } else {
    console.error(
      `[${SERVER_NAME}] Starting v${SERVER_VERSION} (auth=${client.authMode()}, stdio transport)`,
    );
  }

  const server = createPcoMcpServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(`[${SERVER_NAME}] Fatal:`, err);
  process.exit(1);
});
