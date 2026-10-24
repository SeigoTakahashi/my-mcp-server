import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client, isFullPage } from "@notionhq/client";
import { z } from "zod";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 戻り値を作るヘルパー
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const error = (e: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: `Notion APIエラー: ${e instanceof Error ? e.message : String(e)}`,
    },
  ],
  isError: true,
});

// ページのタイトルを取り出す (title 型のプロパティを探す)
function getTitle(page: any): string {
  const prop = Object.values(page.properties ?? {}).find(
    (p: any) => p.type === "title",
  ) as any;
  return prop?.title?.map((t: any) => t.plain_text).join("") || "(無題)";
}

export function registerNotionTools(server: McpServer) {
  // 読み取り1: 検索
  server.registerTool(
    "notion_search",
    {
      title: "Notion検索",
      description:
        "Notionのページをキーワードで検索し、タイトル・ページID・URLを返す。ページを読む/書く前にIDを調べるために使う",
      inputSchema: {
        query: z
          .string()
          .describe("検索キーワード (ページタイトルに含まれる語)"),
      },
    },
    async ({ query }) => {
      try {
        const res = await notion.search({
          query,
          filter: { property: "object", value: "page" },
          page_size: 10,
        });
        const lines = res.results
          .filter(isFullPage)
          .map((p) => `- ${getTitle(p)} (id: ${p.id}) ${p.url}`);
        return text(
          lines.length
            ? lines.join("\n")
            : "該当するページがありません (インテグレーションが接続されているか確認してください)",
        );
      } catch (e) {
        return error(e);
      }
    },
  );

  // 読み取り2: ページ本文
  server.registerTool(
    "notion_read_page",
    {
      title: "Notionページを読む",
      description:
        "指定したNotionページの本文をテキストで返す (先頭100ブロックまで)",
      inputSchema: {
        pageId: z
          .string()
          .describe(
            "ページID。notion_search の結果か、ページURL末尾の32桁の英数字",
          ),
      },
    },
    async ({ pageId }) => {
      try {
        const res = await notion.blocks.children.list({
          block_id: pageId,
          page_size: 100,
        });
        const lines = res.results.map((block: any) => {
          const richText = block[block.type]?.rich_text ?? [];
          const body = richText.map((t: any) => t.plain_text).join("");
          return `[${block.type}] ${body}`;
        });
        return text(lines.join("\n") || "(本文なし)");
      } catch (e) {
        return error(e);
      }
    },
  );

  // 書き込み1: 段落を追記
  server.registerTool(
    "notion_append_text",
    {
      title: "Notionページに追記",
      description:
        "指定したNotionページの末尾に段落を1つ追記する。ユーザーがNotionへのメモ・追記を頼んだときに使う",
      inputSchema: {
        pageId: z.string().describe("追記先のページID"),
        content: z.string().max(2000).describe("追記する本文 (2000文字まで)"),
      },
    },
    async ({ pageId, content }) => {
      try {
        await notion.blocks.children.append({
          block_id: pageId,
          children: [
            {
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: [{ type: "text", text: { content } }] },
            },
          ],
        });
        return text("追記しました");
      } catch (e) {
        return error(e);
      }
    },
  );

  // 書き込み2: 日付ごとのTODOリスト
  const DEFAULT_TODOS = ["ジャーナリング", "筋トレ・ストレッチ"];

  server.registerTool(
    "notion_add_daily_todo",
    {
      title: "日付のTODOリストを追加",
      description:
        "Notionページに、指定した日付のTODOリストをチェックボックスで追記する。日付の下に各項目がネストされる。" +
        "ユーザーが「今日のTODOを作って」「習慣リストを追加して」と頼んだときに使う。" +
        `items を省略すると毎日の習慣 (${DEFAULT_TODOS.join("、")}) が入る。追加の予定があれば items に習慣と合わせて渡す`,
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("日付 (YYYY-MM-DD)。省略時は今日 (日本時間)"),
        items: z
          .array(z.string())
          .optional()
          .describe("TODO項目の一覧。省略時は毎日の習慣"),
        pageId: z
          .string()
          .optional()
          .describe(
            "追記先のページID。省略時は環境変数 NOTION_TODO_PAGE_ID のページ",
          ),
      },
    },
    async ({ date, items, pageId }) => {
      const target = pageId ?? process.env.NOTION_TODO_PAGE_ID;
      if (!target) {
        return error(
          "追記先が分かりません。pageId を指定するか、環境変数 NOTION_TODO_PAGE_ID を設定してください",
        );
      }

      // sv-SE ロケールは YYYY-MM-DD 形式で出力される
      const day =
        date ??
        new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const weekday = new Date(`${day}T00:00:00+09:00`).toLocaleDateString(
        "ja-JP",
        {
          weekday: "short",
          timeZone: "Asia/Tokyo",
        },
      );
      const todos = items?.length ? items : DEFAULT_TODOS;

      const todo = (content: string, children?: any[]) => ({
        object: "block" as const,
        type: "to_do" as const,
        to_do: {
          rich_text: [{ type: "text" as const, text: { content } }],
          checked: false,
          ...(children && { children }),
        },
      });

      try {
        await notion.blocks.children.append({
          block_id: target,
          // 日付の to_do の下に各項目をネスト (1リクエストで2階層まで作成可能)
          children: [
            todo(
              `${day}(${weekday})`,
              todos.map((t) => todo(t)),
            ),
          ],
        });
        return text(
          `${day}(${weekday}) のTODOを追加しました: ${todos.join("、")}`,
        );
      } catch (e) {
        return error(e);
      }
    },
  );
}
