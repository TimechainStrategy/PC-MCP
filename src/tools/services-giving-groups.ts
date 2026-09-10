import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PcoClient } from "../client/pco-client.js";
import { formatToolResult, jsonApiQuerySchema, productGet, requireId } from "./helpers.js";

export function registerServicesTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "services_list_service_types",
    {
      title: "List service types",
      description: "List Service Types (`GET /services/v2/service_types`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "services", "/service_types", args, args.api_version)),
  );

  server.registerTool(
    "services_list_plans",
    {
      title: "List plans",
      description:
        "List plans. Prefer scoping to a service type via service_type_id (`GET /services/v2/service_types/{id}/plans`). Without it, uses `GET /services/v2/plans`.",
      inputSchema: {
        service_type_id: z.string().optional().describe("Optional Service Type id to scope plans"),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.service_type_id
        ? `/service_types/${requireId(args.service_type_id, "service_type_id")}/plans`
        : "/plans";
      return formatToolResult(await productGet(client, "services", path, args, args.api_version));
    },
  );

  server.registerTool(
    "services_get_plan",
    {
      title: "Get a plan",
      description:
        "Get a plan by id. When service_type_id is provided uses `/service_types/{id}/plans/{plan_id}`, otherwise `/plans/{plan_id}`.",
      inputSchema: {
        plan_id: z.string(),
        service_type_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const planId = requireId(args.plan_id, "plan_id");
      const path = args.service_type_id
        ? `/service_types/${requireId(args.service_type_id, "service_type_id")}/plans/${planId}`
        : `/plans/${planId}`;
      return formatToolResult(await productGet(client, "services", path, args, args.api_version));
    },
  );

  server.registerTool(
    "services_list_plan_people",
    {
      title: "List people on a plan",
      description:
        "List PlanPerson records for a plan (`GET /services/v2/service_types/{service_type_id}/plans/{plan_id}/plan_people`).",
      inputSchema: {
        service_type_id: z.string(),
        plan_id: z.string(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const st = requireId(args.service_type_id, "service_type_id");
      const planId = requireId(args.plan_id, "plan_id");
      return formatToolResult(
        await productGet(
          client,
          "services",
          `/service_types/${st}/plans/${planId}/plan_people`,
          args,
          args.api_version,
        ),
      );
    },
  );

  server.registerTool(
    "services_list_songs",
    {
      title: "List songs",
      description: "List songs (`GET /services/v2/songs`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "services", "/songs", args, args.api_version)),
  );

  server.registerTool(
    "services_list_teams",
    {
      title: "List teams",
      description:
        "List teams. With service_type_id: `/service_types/{id}/teams`. Otherwise `/teams`.",
      inputSchema: {
        service_type_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.service_type_id
        ? `/service_types/${requireId(args.service_type_id, "service_type_id")}/teams`
        : "/teams";
      return formatToolResult(await productGet(client, "services", path, args, args.api_version));
    },
  );

  server.registerTool(
    "services_list_folders",
    {
      title: "List service folders",
      description: "List folders (`GET /services/v2/folders`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "services", "/folders", args, args.api_version)),
  );
}

export function registerGivingTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "giving_list_donations",
    {
      title: "List donations",
      description: "List donations (`GET /giving/v2/donations`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "giving", "/donations", args, args.api_version)),
  );

  server.registerTool(
    "giving_get_donation",
    {
      title: "Get a donation",
      description: "Get a donation by id (`GET /giving/v2/donations/{id}`).",
      inputSchema: {
        donation_id: z.string(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const id = requireId(args.donation_id, "donation_id");
      return formatToolResult(
        await productGet(client, "giving", `/donations/${id}`, args, args.api_version),
      );
    },
  );

  server.registerTool(
    "giving_list_funds",
    {
      title: "List funds",
      description: "List funds (`GET /giving/v2/funds`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "giving", "/funds", args, args.api_version)),
  );

  server.registerTool(
    "giving_list_batches",
    {
      title: "List batches",
      description: "List batches (`GET /giving/v2/batches`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "giving", "/batches", args, args.api_version)),
  );

  server.registerTool(
    "giving_list_pledges",
    {
      title: "List pledge campaigns",
      description: "List pledge campaigns (`GET /giving/v2/pledge_campaigns`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "giving", "/pledge_campaigns", args, args.api_version),
      ),
  );

  server.registerTool(
    "giving_list_recurring_donations",
    {
      title: "List recurring donations",
      description: "List recurring donations (`GET /giving/v2/recurring_donations`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "giving", "/recurring_donations", args, args.api_version),
      ),
  );
}

export function registerGroupsTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "groups_list",
    {
      title: "List groups",
      description: "List groups (`GET /groups/v2/groups`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "groups", "/groups", args, args.api_version)),
  );

  server.registerTool(
    "groups_get",
    {
      title: "Get a group",
      description: "Get a group by id (`GET /groups/v2/groups/{id}`).",
      inputSchema: {
        group_id: z.string(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const id = requireId(args.group_id, "group_id");
      return formatToolResult(
        await productGet(client, "groups", `/groups/${id}`, args, args.api_version),
      );
    },
  );

  server.registerTool(
    "groups_list_memberships",
    {
      title: "List group memberships",
      description:
        "List memberships. With group_id: `/groups/{id}/memberships`. Otherwise `/memberships`.",
      inputSchema: {
        group_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.group_id
        ? `/groups/${requireId(args.group_id, "group_id")}/memberships`
        : "/memberships";
      return formatToolResult(await productGet(client, "groups", path, args, args.api_version));
    },
  );

  server.registerTool(
    "groups_list_events",
    {
      title: "List group events",
      description:
        "List group events. With group_id: `/groups/{id}/events`. Otherwise `/events`.",
      inputSchema: {
        group_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.group_id
        ? `/groups/${requireId(args.group_id, "group_id")}/events`
        : "/events";
      return formatToolResult(await productGet(client, "groups", path, args, args.api_version));
    },
  );

  server.registerTool(
    "groups_list_group_types",
    {
      title: "List group types",
      description: "List group types (`GET /groups/v2/group_types`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "groups", "/group_types", args, args.api_version)),
  );
}
