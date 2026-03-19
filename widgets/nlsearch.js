/**
 * AI 自然语言影视搜索模块
 *
 * 用户输入自然语言描述（如「去年的高分科幻片」「类似盗梦空间的悬疑电影」「诺兰执导的作品」），
 * 通过后端 API 调用 LLM 解析意图 + TMDB 搜索，返回匹配结果。
 *
 * 后端通过 userId 进行限流和 Pro 用户识别。
 */

const API_BASE = "https://fluxapi.vvebo.vip/v1/nlsearch";

WidgetMetadata = {
  id: "forward.nlsearch",
  title: "AI Search",
  version: "1.1.0",
  requiredVersion: "0.0.1",
  description: "Describe what you want to watch, AI finds matching results",
  author: "Forward",
  site: "https://github.com/InchStudio/ForwardWidgets",
  modules: [
    {
      id: "aiDiscover",
      title: "AI Discover",
      functionName: "nlSearch",
      cacheDuration: 3600,
      params: [
        {
          name: "keyword",
          title: "Describe what you want",
          type: "input",
          value: "recommend something",
          description: "Natural language search powered by AI",
          placeholders: [
            { title: "Recommend something", value: "recommend something" },
            { title: "Top sci-fi last year", value: "top sci-fi movies from last year" },
            { title: "Nolan's movies", value: "Christopher Nolan movies" },
            { title: "Like Inception", value: "movies like Inception" },
          ],
        },
        {
          name: "language",
          title: "Language",
          type: "language",
          value: "zh-CN",
        },
        {
          name: "userId",
          title: "User ID",
          type: "userId",
        },
      ],
    },
  ],
  search: {
    title: "AI Search",
    functionName: "nlSearch",
    params: [
      {
        name: "keyword",
        title: "Search",
        type: "input",
        description: "Natural language search powered by AI",
        placeholders: [
          { title: "Top sci-fi last year", value: "top sci-fi movies from last year" },
          { title: "Nolan's movies", value: "Christopher Nolan movies" },
          { title: "Like Inception", value: "movies like Inception" },
          { title: "Trending TV shows", value: "trending TV shows right now" },
        ],
      },
      {
        name: "language",
        title: "Language",
        type: "language",
        value: "zh-CN",
      },
      {
        name: "userId",
        title: "User ID",
        type: "userId",
      },
    ],
  },
};

async function nlSearch(params = {}) {
  const keyword = (params.keyword || params.query || "").trim();
  if (!keyword) throw new Error("Please enter a search description");

  const language = params.language || "en-US";

  try {
    const response = await Widget.http.post(
      `${API_BASE}/search`,
      { query: keyword, userId: params.userId || "", language: language },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    if (!data || !data.success) {
      throw new Error((data && data.message) || "Search failed");
    }

    return data.data || [];
  } catch (error) {
    console.error("[AI Search] Request failed:", error.message || error);
    throw new Error("AI search service is temporarily unavailable, please try again later");
  }
}
