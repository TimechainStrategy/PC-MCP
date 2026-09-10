import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PcoClient } from "../client/pco-client.js";
import { formatToolResult, jsonApiQuerySchema, productGet, requireId } from "./helpers.js";

export function registerCheckInsTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "checkins_list_events",
    {
      title: "List Check-Ins events",
      description: "List Check-Ins events (`GET /check-ins/v2/events`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "check-ins", "/events", args, args.api_version)),
  );

  server.registerTool(
    "checkins_list_event_times",
    {
      title: "List Check-Ins event times",
      description:
        "List event times. With event_id: `/events/{id}/event_times`. Otherwise `/event_times`.",
      inputSchema: {
        event_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.event_id
        ? `/events/${requireId(args.event_id, "event_id")}/event_times`
        : "/event_times";
      return formatToolResult(await productGet(client, "check-ins", path, args, args.api_version));
    },
  );

  server.registerTool(
    "checkins_list_check_ins",
    {
      title: "List check-ins",
      description:
        "List check-ins (`GET /check-ins/v2/check_ins`). Optionally scope with event_id to `/events/{id}/check_ins` when supported.",
      inputSchema: {
        event_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.event_id
        ? `/events/${requireId(args.event_id, "event_id")}/check_ins`
        : "/check_ins";
      return formatToolResult(await productGet(client, "check-ins", path, args, args.api_version));
    },
  );

  server.registerTool(
    "checkins_list_stations",
    {
      title: "List check-in stations",
      description: "List stations (`GET /check-ins/v2/stations`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "check-ins", "/stations", args, args.api_version)),
  );

  server.registerTool(
    "checkins_list_headcounts",
    {
      title: "List headcounts",
      description: "List headcounts (`GET /check-ins/v2/headcounts`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "check-ins", "/headcounts", args, args.api_version)),
  );
}

export function registerCalendarTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "calendar_list_events",
    {
      title: "List Calendar events",
      description: "List Calendar events (`GET /calendar/v2/events`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "calendar", "/events", args, args.api_version)),
  );

  server.registerTool(
    "calendar_get_event",
    {
      title: "Get a Calendar event",
      description: "Get a Calendar event (`GET /calendar/v2/events/{id}`).",
      inputSchema: {
        event_id: z.string(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const id = requireId(args.event_id, "event_id");
      return formatToolResult(
        await productGet(client, "calendar", `/events/${id}`, args, args.api_version),
      );
    },
  );

  server.registerTool(
    "calendar_list_event_instances",
    {
      title: "List Calendar event instances",
      description:
        "List event instances (`GET /calendar/v2/event_instances`). With event_id: `/events/{id}/event_instances`.",
      inputSchema: {
        event_id: z.string().optional(),
        ...jsonApiQuerySchema,
        api_version: z.string().optional(),
      },
    },
    async (args) => {
      const path = args.event_id
        ? `/events/${requireId(args.event_id, "event_id")}/event_instances`
        : "/event_instances";
      return formatToolResult(await productGet(client, "calendar", path, args, args.api_version));
    },
  );

  server.registerTool(
    "calendar_list_resources",
    {
      title: "List Calendar resources",
      description: "List resources (`GET /calendar/v2/resources`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "calendar", "/resources", args, args.api_version)),
  );

  server.registerTool(
    "calendar_list_resource_bookings",
    {
      title: "List resource bookings",
      description: "List resource bookings (`GET /calendar/v2/resource_bookings`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "calendar", "/resource_bookings", args, args.api_version),
      ),
  );

  server.registerTool(
    "calendar_list_calendars",
    {
      title: "List calendars",
      description: "List calendars (`GET /calendar/v2/calendars`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "calendar", "/calendars", args, args.api_version)),
  );
}

export function registerPublishingTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "publishing_list_channels",
    {
      title: "List Publishing channels",
      description: "List channels (`GET /publishing/v2/channels`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "publishing", "/channels", args, args.api_version)),
  );

  server.registerTool(
    "publishing_list_episodes",
    {
      title: "List Publishing episodes",
      description: "List episodes (`GET /publishing/v2/episodes`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "publishing", "/episodes", args, args.api_version)),
  );

  server.registerTool(
    "publishing_list_series",
    {
      title: "List Publishing series",
      description: "List series (`GET /publishing/v2/series`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "publishing", "/series", args, args.api_version)),
  );

  server.registerTool(
    "publishing_list_speakers",
    {
      title: "List Publishing speakers",
      description: "List speakers (`GET /publishing/v2/speakers`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(await productGet(client, "publishing", "/speakers", args, args.api_version)),
  );
}

export function registerRegistrationsTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "registrations_list",
    {
      title: "List registrations",
      description: "List registrations (`GET /registrations/v2/registrations`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "registrations", "/registrations", args, args.api_version),
      ),
  );

  server.registerTool(
    "registrations_list_signups",
    {
      title: "List registration signups",
      description: "List signups (`GET /registrations/v2/signups`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "registrations", "/signups", args, args.api_version),
      ),
  );

  server.registerTool(
    "registrations_list_attendees",
    {
      title: "List registration attendees",
      description: "List attendees (`GET /registrations/v2/attendees`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "registrations", "/attendees", args, args.api_version),
      ),
  );

  server.registerTool(
    "registrations_list_categories",
    {
      title: "List registration categories",
      description: "List categories (`GET /registrations/v2/categories`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "registrations", "/categories", args, args.api_version),
      ),
  );
}

export function registerWebhooksTools(server: McpServer, client: PcoClient): void {
  server.registerTool(
    "webhooks_list_subscriptions",
    {
      title: "List webhook subscriptions",
      description: "List webhook subscriptions (`GET /webhooks/v2/webhook_subscriptions`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "webhooks", "/webhook_subscriptions", args, args.api_version),
      ),
  );

  server.registerTool(
    "webhooks_list_available_events",
    {
      title: "List available webhook events",
      description: "List available webhook event types (`GET /webhooks/v2/available_events`).",
      inputSchema: { ...jsonApiQuerySchema, api_version: z.string().optional() },
    },
    async (args) =>
      formatToolResult(
        await productGet(client, "webhooks", "/available_events", args, args.api_version),
      ),
  );
}
