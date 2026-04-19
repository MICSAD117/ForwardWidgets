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
    // 搜索模块
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
    // 热门模块
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
    // 最新模块
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
    // 中文模块
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


/**
 * 从标题中提取番号
 * 支持格式：SSIS-001, MIDE-123, IPX-001, 300MIUM-001 等
 * 也支持纯数字如 001（从标题开头提取）
 */
function extractNum(title) {
  if (!title) return "";
  
  // 常见番号格式：字母-数字，如 SSIS-001, MIDE-123, IPX-001
  const pattern1 = /\b([A-Z]+\d*-\d+)\b/i;
  const match1 = title.match(pattern1);
  if (match1) return match1[1].toUpperCase();
  
  // 复合格式：如 300MIUM-001
  const pattern2 = /\b(\d+[A-Z]+\d*-\d+)\b/i;
  const match2 = title.match(pattern2);
  if (match2) return match2[1].toUpperCase();
  
  // 纯数字格式：如 001, 123
  const pattern3 = /\b(\d{3,})\b/;
  const match3 = title.match(pattern3);
  if (match3) return match3[1];
  
  return "";
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
  const items = sections.flatMap((section) => section.childItems);
  return items;
}

async function loadPageSections(params = {}) {
  try {
    let url = params.url;
    if (!url) {
      throw new Error("地址不能为空");
    }
    if (params["sort_by"]) {
      url += `&sort_by=${params.sort_by}`;
    }
    if (params["from"]) {
      url += `&from=${params.from}`;
    }
    const response = await Widget.http.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response || !response.data || typeof response.data !== "string") {
      throw new Error("无法获取有效的HTML内容");
    }

    return parseHtml(response.data);
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

  let sections = [];
  const sectionElements = $(sectionSelector).toArray();
  
  for (const sectionElement of sectionElements) {
    const $sectionElement = $(sectionElement);
    var items = [];
    const sectionTitle = $sectionElement.find(".title-box .h3-md").first();
    const sectionTitleText = sectionTitle.text();
    const itemElements = $sectionElement.find(itemSelector).toArray();
    
    if (itemElements && itemElements.length > 0) {
      for (const itemElement of itemElements) {
        const $itemElement = $(itemElement);
        const titleId = $itemElement.find(titleSelector).first();
        const url = titleId.attr("href") || "";
        
        if (url && url.includes("jable.tv")) {
          const durationId = $itemElement.find(durationSelector).first();
          const coverId = $itemElement.find(coverSelector).first();
          const cover = coverId.attr("data-src");
          const video = coverId.attr("data-preview");
          const title = titleId.text();
          const duration = durationId.text().trim();
          
          // 提取番号，用于关联外部资源库
          const num = extractNum(title);
          
          const item = {
            id: num,
            type: "url",
            title: title,
            num: num,                    // 番号，关联键
			posterPath: 
            backdropPath: cover,
            previewUrl: video,
            link: url,
            mediaType: "movie",
            description: "",
            releaseDate: duration,
            playerType: "system"
          };
          items.push(item);
        }
      }
    }
    
    if (items.length > 0) {
      sections.push({
        title: sectionTitleText,
        childItems: items
      });
    }
  }
  
  return sections;
}


/**
 * 关联函数：加载详情页，提取视频资源
 * 
 * 关联模式：
 * 1. 列表返回 item.num（番号）
 * 2. loadDetail 可用 num 匹配外部资源库
 * 3. 外部资源库匹配失败时，回退到 Jable 原生解析
 * 
 * 要关联外部资源库，在下方添加你的资源库查询逻辑：
 * - 用 num（番号）作为查询键
 * - 返回包含 videoUrl 的对象
 */
async function loadDetail(link) {
  const response = await Widget.http.get(link, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": "https://jable.tv/"
    },
  });
  
  // 从页面提取番号（标题中）
  const $ = Widget.html.load(response.data);
  const pageTitle = $("title").text() || "";
  const num = extractNum(pageTitle);
  
  // ========== 资源库关联区域 ==========
  // 在这里添加外部资源库查询逻辑
  // 用 num（番号）查询，例如：
  // if (num) {
  //   const resourceUrl = `https://你的资源库.com/api?num=${num}`;
  //   const res = await Widget.http.get(resourceUrl);
  //   if (res.data && res.data.videoUrl) {
  //     return {
  //       id: link,
  //       type: "detail",
  //       videoUrl: res.data.videoUrl,
  //       num: num,
  //       playerType: "ijk"
  //     };
  //   }
  // }
  // =====================================
  
  // 回退到 Jable 原生解析
  let hlsUrl = "";
  const match = response.data.match(/var\s+hlsUrl\s*=\s*['"](.*?)['"]/i);
  if (match && match[1]) {
    hlsUrl = match[1];
  }

  if (!hlsUrl) {
    throw new Error("无法获取有效的播放地址，可能需要代理验证");
  }
  
  return {
    id: link,
    type: "detail",
    videoUrl: hlsUrl,
    num: num,
    playerType: "ijk", 
    customHeaders: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": link,
      "Origin": "https://jable.tv"
    }
  };
}
