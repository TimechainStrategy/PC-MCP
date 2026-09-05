import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PcoClient } from "./client/pco-client.js";
import { endpointsCatalog, filterEndpoints, listProductsSummary } from "./catalog/products.js";
import { registerCoreTools, registerPeopleTools } from "./tools/core-and-people.js";
import {
  registerGivingTools,
  registerGroupsTools,
  registerServicesTools,
} from "./tools/services-giving-groups.js";
import {
  registerCalendarTools,
  registerCheckInsTools,
  registerPublishingTools,
  registerRegistrationsTools,
  registerWebhooksTools,
} from "./tools/other-products.js";

export const SERVER_NAME = "pc-mcp";
export const SERVER_VERSION = "1.0.0";

export function createPcoMcpServer(client: PcoClient): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerCoreTools(server, client);
  registerPeopleTools(server, client);
  registerServicesTools(server, client);
  registerGivingTools(server, client);
  registerGroupsTools(server, client);
  registerCheckInsTools(server, client);
  registerCalendarTools(server, client);
  registerPublishingTools(server, client);
  registerRegistrationsTools(server, client);
  registerWebhooksTools(server, client);

  registerResources(server);

  return server;
}

function registerResources(server: McpServer): void {
  server.registerResource(
    "pco-products",
    "pco://products",
    {
      title: "Planning Center products",
      description: "Summary of Planning Center API products and docs links",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              baseUrl: endpointsCatalog.baseUrl,
              docs: "https://api.planningcenteronline.com/docs/",
              products: listProductsSummary(),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    "pco-product-endpoints",
    new ResourceTemplate("pco://products/{product}/endpoints", {
      list: async () => ({
        resources: listProductsSummary().map((p) => ({
          uri: `pco://products/${p.id}/endpoints`,
          name: `${p.title} endpoints`,
          mimeType: "application/json",
          description: `OpenAPI-derived endpoint list for ${p.title}`,
        })),
      }),
    }),
    {
      title: "Product endpoint catalog",
      description: "Documented endpoints for a Planning Center product (from OpenAPI)",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const product = String(variables.product);
      const filtered = filterEndpoints(product, { limit: 5000, offset: 0 });
      if (!filtered) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: `Unknown product: ${product}` }, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                product: {
                  id: product,
                  title: filtered.product.title,
                  apiPath: filtered.product.apiPath,
                  version: filtered.product.version,
                  docs: filtered.product.docs,
                },
                total: filtered.total,
                endpoints: filtered.endpoints,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerResource(
    "pco-docs-overview",
    "pco://docs/overview",
    {
      title: "PCO developer docs links",
      description: "Links to Planning Center API overview guides",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              gettingStarted: "https://api.planningcenteronline.com/docs/overview/getting-started",
              authentication: "https://api.planningcenteronline.com/docs/overview/authentication",
              rateLimiting: "https://api.planningcenteronline.com/docs/overview/rate-limiting",
              jsonApi: "https://api.planningcenteronline.com/docs/overview/json-api",
              errors: "https://api.planningcenteronline.com/docs/overview/errors",
              versioning: "https://api.planningcenteronline.com/docs/overview/versioning",
              webhooks: "https://api.planningcenteronline.com/docs/overview/webhooks",
              apiReference: "https://api.planningcenteronline.com/docs/apps",
              personalAccessTokens: "https://api.planningcenteronline.com/personal_access_tokens",
              oauthApplications: "https://api.planningcenteronline.com/oauth/applications",
            },
            null,
            2,
          ),
        },
      ],
    }),
  );
}
