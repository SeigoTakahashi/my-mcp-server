import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// WMO Weather code を日本語の天気に変換するヘルパー関数
function getWeatherDescription(code: number): string {
  const weatherMap: Record<number, string> = {
    0: "快晴",
    1: "晴れ",
    2: "一部曇り",
    3: "曇り",
    45: "霧",
    48: "霧氷",
    51: "霧雨（軽度）",
    53: "霧雨（中度）",
    55: "霧雨（濃い）",
    61: "雨（小雨）",
    63: "雨（中度）",
    65: "雨（豪雨）",
    71: "雪（小雪）",
    73: "雪（中度）",
    75: "雪（大雪）",
    95: "雷雨",
  };
  return weatherMap[code] ?? "不明";
}

// ツール3: 天気予報 (Open-Meteo連携)
export function registerWeatherTool(server: McpServer) {
  server.registerTool(
    "get_weather",
    {
      title: "天気予報",
      description:
        "指定した都市の現在の天気や気温を返す。ユーザーが天気を聞いたときに使う",
      inputSchema: {
        city: z.string().describe("都市名 (例: Tokyo, Osaka, London)"),
      },
    },
    async ({ city }) => {
      try {
        // 1. ジオコーディングAPIで都市名から緯度・経度を取得
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja&format=json`,
        );
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `都市 "${city}" が見つかりませんでした。`,
              },
            ],
            isError: true,
          };
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        // 2. Open-Meteoの天気予報APIを呼び出す (weather_code と temperature_2m を取得)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
        );
        const weatherData = await weatherRes.json();

        const temp = weatherData.current.temperature_2m;
        const unit = weatherData.current_units.temperature_2m;
        const weatherCode = weatherData.current.weather_code;
        const weatherDesc = getWeatherDescription(weatherCode);

        return {
          content: [
            {
              type: "text",
              text: `${name} (${country}) の天気は「${weatherDesc}」、現在の気温は ${temp} ${unit} です。`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `天気の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
