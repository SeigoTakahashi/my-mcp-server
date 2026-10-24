# My MCP Server

TypeScript と Model Context Protocol (MCP) を使って自作したカスタムMCPサーバーのハンズオンリポジトリです。Claude などのAIから、天気情報の取得や Notion の操作を行えるツールを提供します。

## 🛠️ 提供しているツール (Tools)

- **`add`**: 2つの数値の足し算を行う（基本のサンプル）
- **`get_weather`**: Open-Meteo API を使って指定した都市の現在の天気を取得する
- **`notion_search`**: Notionのページをキーワードで検索し、タイトル・ID・URLを返す
- **`notion_read_page`**: 指定したNotionページの本文をテキストで読む
- **`notion_append_text`**: Notionページの末尾に段落を追記する
- **`notion_add_daily_todo`**: 指定した日付のTODOリスト（チェックボックス）を追記する

---

## 📦 技術スタック

- TypeScript (ESM / Node16)
- pnpm
- `@modelcontextprotocol/sdk`
- Zod (入力バリデーション)
- `@notionhq/client` (Notion API)

---

## 🚀 導入・セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone https://github.com/SeigoTakahashi/my-mcp-server.git
cd my-mcp-server
pnpm install
```

### 2. 環境変数の設定 (セキュリティ考慮)

本サーバーでは、機密情報（Notionのトークン等）がプロジェクト内のコンテキストに混入したりGitに誤ってコミットされるのを防ぐため、プロジェクト外の安全なディレクトリに `.env` を配置します。

ホームディレクトリに設定ファイル用のフォルダと `.env` を作成します：

```bash
mkdir -p ~/.config/my-mcp-server
cat > ~/.config/my-mcp-server/.env <<'EOF'
NOTION_TOKEN=ntn_xxxxx
NOTION_TODO_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF
chmod 600 ~/.config/my-mcp-server/.env
```

(※ どのような環境変数が必要かは `.env.example` を参照してください)

### 3. ビルド

```bash
pnpm build
```

## 🔍 動作確認 (MCP Inspector)

MCP公式のインスペクターツールを使って動作テストを行います。Node.js v20.6以降の `--env-file` オプションで外部の `.env` を安全に読み込ませます。

```bash
pnpm dlx @modelcontextprotocol/inspector node --env-file=$HOME/.config/my-mcp-server/.env build/index.js
```

ブラウザ上でインスペクターが起動したら、各ツール（get_weather や Notion系）の動作をテストできます。
