import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ツール2: 現在時刻
export function registerTimeTool(server: McpServer) {
  server.registerTool(
    "get_current_time",
    {
      title: "現在時刻",
      description:
        "指定したタイムゾーンの現在時刻を返す(省略時は Asia/Tokyo)",
      inputSchema: { timeZone: z.string().optional() },
    },
    async ({ timeZone }) => {
      const tz = timeZone ?? "Asia/Tokyo";
      const now = new Date().toLocaleString("ja-JP", { timeZone: tz });
      return { content: [{ type: "text", text: `${tz}: ${now}` }] };
    },
  );
}
