#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { requestTool } from "./tools/request.js";
import { communityInfoTool, communityLabelsTool } from "./tools/community.js";
import { membersListTool, membersPendingTool, membersApproveTool, membersRejectTool } from "./tools/members.js";
import { postsListTool, postsGetTool, postsCreateTool, postsCommentTool } from "./tools/posts.js";
import { coursesListTool, lessonsListTool } from "./tools/classroom.js";
import { notificationsTool } from "./tools/notifications.js";

// Start the server
function setupServer() {
  const server = new McpServer({
    name: "skool-mcp",
    version: "0.1.0",
  });

  // Discovery
  server.tool(
    requestTool.name,
    requestTool.description,
    requestTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await requestTool.handler(args) }] }),
  );

  // Community
  server.tool(
    communityInfoTool.name,
    communityInfoTool.description,
    communityInfoTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await communityInfoTool.handler(args) }] }),
  );

  server.tool(
    communityLabelsTool.name,
    communityLabelsTool.description,
    communityLabelsTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await communityLabelsTool.handler(args) }] }),
  );

  // Members
  server.tool(
    membersListTool.name,
    membersListTool.description,
    membersListTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await membersListTool.handler(args) }] }),
  );

  server.tool(
    membersPendingTool.name,
    membersPendingTool.description,
    membersPendingTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await membersPendingTool.handler(args) }] }),
  );

  server.tool(
    membersApproveTool.name,
    membersApproveTool.description,
    membersApproveTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await membersApproveTool.handler(args) }] }),
  );

  server.tool(
    membersRejectTool.name,
    membersRejectTool.description,
    membersRejectTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await membersRejectTool.handler(args) }] }),
  );

  // Posts
  server.tool(
    postsListTool.name,
    postsListTool.description,
    postsListTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await postsListTool.handler(args) }] }),
  );

  server.tool(
    postsGetTool.name,
    postsGetTool.description,
    postsGetTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await postsGetTool.handler(args) }] }),
  );

  server.tool(
    postsCreateTool.name,
    postsCreateTool.description,
    postsCreateTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await postsCreateTool.handler(args) }] }),
  );

  server.tool(
    postsCommentTool.name,
    postsCommentTool.description,
    postsCommentTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await postsCommentTool.handler(args) }] }),
  );

  // Classroom
  server.tool(
    coursesListTool.name,
    coursesListTool.description,
    coursesListTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await coursesListTool.handler(args) }] }),
  );

  server.tool(
    lessonsListTool.name,
    lessonsListTool.description,
    lessonsListTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await lessonsListTool.handler(args) }] }),
  );

  // Notifications
  server.tool(
    notificationsTool.name,
    notificationsTool.description,
    notificationsTool.inputSchema,
    async (args) => ({ content: [{ type: "text", text: await notificationsTool.handler(args) }] }),
  );

  return server;
}

async function main() {
  const args = process.argv.slice(2);
  const isHttp = process.env.PORT !== undefined || args.includes("--http");

  if (isHttp) {
    const express = await import("express");
    const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");

    const app = express.default();
    app.use(express.json());

    // Healthcheck endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "ok", version: "0.1.0" });
    });

    const transports = new Map<string, typeof SSEServerTransport.prototype>();

    app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport("/message", res);

      const server = setupServer();
      await server.connect(transport);

      transports.set(transport.sessionId, transport);

      res.on("close", () => {
        transports.delete(transport.sessionId);
        transport.close().catch(console.error);
      });
    });

    app.post("/message", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }
      await transport.handlePostMessage(req, res, req.body);
    });

    const port = parseInt(process.env.PORT || "3000", 10);
    app.listen(port, () => {
      console.log(`Skool MCP server running on HTTP at http://localhost:${port}/sse`);
    });
  } else {
    const server = setupServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Skool MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
