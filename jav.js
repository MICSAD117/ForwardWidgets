//Original Author:nibiru
//Modified: renamed to jav, version 0.1.0
// 关联模式：通过 num（番号）匹配外部资源库

WidgetMetadata = {
  id: "jav",
  title: "JAV",
  description: "JAV视频资源聚合，支持番号关联外部资源库",
  author: "nibiru｜MakkaPakka｜蝴蝶",
  site: "https://widgets-xd.vercel.app",
  version: "0.1.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    {
      title: "搜索",
      description: "按番号或关键词搜索",
      requiresWebView: false,
      functionName: "search",
      cacheDuration: 3600,
      params: [
        {
          name: "keyword",
          title: "关键词/番号",
          type: "input",
          description: "关键词/番号",
        },
        {
          name: "sort_by",
          title: "排序",
          type: "enumeration",
          description: "排序",
          enumOptions: [
            { title: "最多观看", value: "video_viewed" },
            { title: "近期最佳", value: "post_date_and_popularity" },
            { title: "最近更新", value: "post_date" },
            { title: "最多收藏", value: "most_favourited" },
          ],
        },
        { name: "from", title: "页码", type: "page", description: "页码", value: "1" },
      ],
    },
    {
      title: "热门",
      description: "热门影片",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "列表地址",
          type: "constant",
          description: "列表地址",
          value: "https://jable.tv/hot/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "排序",
          type: "enumeration",
          description: "排序",
          enumOptions: [
            { title: "今日热门", value: "video_viewed_today" },
            { title: "本周热门", value: "video_viewed_week" },
            { title: "本月热门", value: "video_viewed_month" },
            { title: "所有时间", value: "video_viewed" },
          ],
        },
        { name: "from", title: "页码", type: "page", description: "页码", value: "1" },
      ],
    },
    {
      title: "最新",
      description: "最新上映影片",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "列表地址",
          type: "constant",
          description: "列表地址",
          value: "https://jable.tv/new-release/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "排序",
          type: "enumeration",
          description: "排序",
          enumOptions: [
            { title: "最新发布", value: "latest-updates" },
            { title: "最多观看", value: "video_viewed" },
            { title: "最多收藏", value: "most_favourited" },
          ],
        },
        { name: "from", title: "页码", type: "page", description: "页码", value: "1" },
      ],
    },
    {
      title: "中文",
      description: "中文字幕影片",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "列表地址",
          type: "constant",
          description: "列表地址",
          value: "https://jable.tv/categories/chinese-subtitle/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "排序",
          type: "enumeration",
          description: "排序",
          enumOptions: [
            { title: "最近更新", value: "post_date" },
            { title: "最多观看", value: "video_viewed" },
            { title: "最多收藏", value: "most_favourited" },
          ],
        },
        { name: "from", title: "页码", type: "page", description: "页码", value: "1" },
      ],
    },
  ],
};

function extractNum(title) {
  if (!title) return "";
  const pattern1 = /\b([A-Z]+\d*-\d+)\b/i;
  const match1 = title.match(pattern1);
  if (match1) return match1[1].toUpperCase();

  const pattern2 = /\b(\d+[A-Z]+\d*-\d+)\b/i;
  const match2 = title.match(pattern2);
  if (match2) return match2[1].toUpperCase();

  const pattern3 = /\b(\d{3,})\b/;
  const match3 = title.match(pattern3);
  if (match3) return match3[1];

  return "";
}

function parseDuration(durationText) {
  if (!durationText) {
    return { duration: 0, durationText: "" };
  }
  const normalized = durationText.trim();
  const parts = normalized.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some(Number.isNaN)) {
    return { duration: 0, durationText: normalized };
  }
  let duration = 0;
  if (parts.length === 3) {
    duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    duration = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    duration = parts[0];
  }
  return { duration, durationText: normalized };
}

function normalizeToAbsoluteUrl(url, base) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
}

async function resolveDmmPosterPath(num, fallbackPosterPath) {
  if (!num) {
    return fallbackPosterPath || "";
  }

  try {
    const searchUrl = `https://video.dmm.co.jp/av/-/list/search/=/?searchstr=${encodeURIComponent(num)}`;
    const response = await Widget.http.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: "https://video.dmm.co.jp/av/",
      },
    });

    const html = response?.data;
    if (!html || typeof html !== "string") {
      return fallbackPosterPath || "";
    }

    const $ = Widget.html.load(html);
    const poster =
      $(".dcd-main-result .dcd-box img").first().attr("data-src") ||
      $(".dcd-main-result .dcd-box img").first().attr("src") ||
      $("img").first().attr("data-src") ||
      $("img").first().attr("src") ||
      "";

    return normalizeToAbsoluteUrl(poster, "https://video.dmm.co.jp") || fallbackPosterPath || "";
  } catch (error) {
    return fallbackPosterPath || "";
  }
}

async function search(params = {}) {
  const keyword = encodeURIComponent(params.keyword || "");
  let url = `https://jable.tv/search/${keyword}/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=${keyword}`;

  if (params.sort_by) {
    url += `&sort_by=${params.sort_by}`;
  }

  if (params.from) {
    url += `&from=${params.from}`;
  }

  return await loadPage({ ...params, url });
}

async function loadPage(params = {}) {
  const sections = await loadPageSections(params);
  return sections.flatMap((section) => section.childItems || []);
}

async function loadPageSections(params = {}) {
  try {
    let url = params.url;
    if (!url) {
      throw new Error("地址不能为空");
    }
    if (params.sort_by) {
      url += `&sort_by=${params.sort_by}`;
    }
    if (params.from) {
      url += `&from=${params.from}`;
    }
    const response = await Widget.http.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response || !response.data || typeof response.data !== "string") {
      throw new Error("无法获取有效的HTML内容");
    }

    return await parseHtml(response.data);
  } catch (error) {
    console.error("加载页面出错:", error.message);
    throw error;
  }
}

async function parseHtml(htmlContent) {
  const $ = Widget.html.load(htmlContent);
  const sectionSelector = ".site-content .py-3,.pb-e-lg-40";
  const itemSelector = ".video-img-box";
  const coverSelector = "img";
  const durationSelector = ".absolute-bottom-right .label";
  const titleSelector = ".title a";
  const genreSelector = ".label-tag";

  const sections = [];
  const sectionElements = $(sectionSelector).toArray();

  for (const sectionElement of sectionElements) {
    const $sectionElement = $(sectionElement);
    const items = [];
    const sectionTitleText = $sectionElement.find(".title-box .h3-md").first().text().trim();
    const itemElements = $sectionElement.find(itemSelector).toArray();

    for (const itemElement of itemElements) {
      const $itemElement = $(itemElement);
      const titleId = $itemElement.find(titleSelector).first();
      const url = titleId.attr("href") || "";

      if (!url || !url.includes("jable.tv")) {
        continue;
      }

      const durationTextRaw = $itemElement.find(durationSelector).first().text().trim();
      const { duration, durationText } = parseDuration(durationTextRaw);
      const coverId = $itemElement.find(coverSelector).first();
      const cover = coverId.attr("data-src") || coverId.attr("src") || "";
      const previewVideo = coverId.attr("data-preview") || "";
      const title = titleId.text().trim();
      const num = extractNum(title);
      const genreTitle = $itemElement.find(genreSelector).first().text().trim();
      const posterPath = await resolveDmmPosterPath(num, cover);

      const item = {
        id: url,
        type: "url",
        title,
        num,
        posterPath,
        backdropPath: cover,
        releaseDate: "",
        mediaType: "movie",
        rating: "",
        genreTitle: genreTitle || sectionTitleText || "",
        duration,
        durationText,
        previewUrl: previewVideo,
        videoUrl: "",
        link: url,
        episode: 0,
        description: "",
        playerType: "system",
        childItems: [],
      };
      items.push(item);
    }

    if (items.length > 0) {
      sections.push({
        title: sectionTitleText,
        childItems: items,
      });
    }
  }

  return sections;
}

async function loadDetail(link) {
  const response = await Widget.http.get(link, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Referer: "https://jable.tv/",
    },
  });

  const $ = Widget.html.load(response.data || "");
  const pageTitle = $("title").text() || "";
  const num = extractNum(pageTitle);

  let hlsUrl = "";
  const match = (response.data || "").match(/var\s+hlsUrl\s*=\s*['\"](.*?)['\"]/i);
  if (match && match[1]) {
    hlsUrl = match[1];
  }

  if (!hlsUrl) {
    throw new Error("无法获取有效的播放地址，可能需要代理验证");
  }

  const ogImage = $("meta[property='og:image']").attr("content") || "";
  const posterPath = await resolveDmmPosterPath(num, ogImage);

  return {
    id: link,
    type: "url",
    title: $("meta[property='og:title']").attr("content") || pageTitle,
    num,
    posterPath,
    backdropPath: ogImage,
    releaseDate: "",
    mediaType: "movie",
    rating: "",
    genreTitle: "",
    duration: 0,
    durationText: "",
    previewUrl: "",
    videoUrl: hlsUrl,
    link,
    episode: 0,
    description: $("meta[property='og:description']").attr("content") || "",
    playerType: "ijk",
    childItems: [],
    customHeaders: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: link,
      Origin: "https://jable.tv",
    },
  };
}
