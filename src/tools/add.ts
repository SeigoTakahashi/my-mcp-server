import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ツール1: 足し算
export function registerAddTool(server: McpServer) {
  server.registerTool(
    "add",
    {
      title: "足し算",
      description: "2つの数値を足し算して結果を返す",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    }),
  );
}
