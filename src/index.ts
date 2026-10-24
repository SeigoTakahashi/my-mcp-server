// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 各ツールファイルをインポート
import { registerAddTool } from "./tools/add.js";
import { registerTimeTool } from "./tools/time.js";
import { registerWeatherTool } from "./tools/weather.js";
import { registerNotionTools } from "./tools/notion.js";

// サーバー本体の作成
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

// 各ツールの登録関数を呼び出してまとめる
registerAddTool(server);
registerTimeTool(server);
registerWeatherTool(server);
registerNotionTools(server);

// stdio で起動(stdout はプロトコル通信に使うので、ログは console.error で出す)
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("my-mcp-server running on stdio");
