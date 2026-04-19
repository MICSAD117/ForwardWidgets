/**
 * 使用 @forward-widget/libs 运行 jav.js 的测试程序（自适配常见 API）
 *
 * 用法：
 *   node test-jav-with-libs.mjs
 *
 * 可选环境变量：
 *   JAV_SEARCH_KEYWORD=ssis
 *   JAV_PAGE_FROM=1
 *   JAV_DETAIL_LINK=https://jable.tv/videos/xxxxx/
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetFile = path.join(__dirname, 'jav.js');
const require = createRequire(import.meta.url);

const keyword = process.env.JAV_SEARCH_KEYWORD || 'ssis';
const from = process.env.JAV_PAGE_FROM || '1';
const manualDetailLink = process.env.JAV_DETAIL_LINK || '';

function printResult(label, payload) {
  try {
    const text = JSON.stringify(payload, null, 2);
    console.log(`\n=== ${label} ===\n${text.slice(0, 3000)}${text.length > 3000 ? '\n...<truncated>' : ''}`);
  } catch {
    console.log(`\n=== ${label} ===\n`, payload);
  }
}

function pickFirstLink(items) {
  if (!Array.isArray(items)) return '';
  return items.find((x) => x && typeof x.link === 'string' && x.link.startsWith('http'))?.link || '';
}

async function main() {
  let libs;
  let loadError;
  // 优先用 require 兼容未配置 exports 的包
  try {
    libs = require('@forward-widget/libs');
  } catch (error) {
    loadError = error;
  }

  // require 失败再尝试 ESM import（兼容新版本）
  if (!libs) {
    try {
      libs = await import('@forward-widget/libs');
      // ESM default 兼容
      libs = libs?.default ? { ...libs, ...libs.default } : libs;
    } catch (error) {
      loadError = error;
    }
  }

  if (!libs) {
    console.error('未能加载 @forward-widget/libs，请先安装并确认包入口可用：');
    console.error('  npm i -D @forward-widget/libs');
    console.error('\n原始错误：', loadError?.message || loadError);
    process.exit(1);
  }

  const availableExports = Object.keys(libs).sort();
  console.log('已加载 @forward-widget/libs，可用导出：', availableExports.join(', '));

  // 兼容不同版本 API：优先尝试常见 runner 创建函数
  const createRunner =
    libs.createWidgetRunner ||
    libs.createForwardWidgetRunner ||
    libs.createRunner ||
    libs.createWidgetExecutor ||
    null;

  if (!createRunner) {
    console.error('\n无法识别 @forward-widget/libs 的 runner 创建 API。');
    console.error('请检查导出并按当前版本调整：', availableExports);
    process.exit(2);
  }

  // 尝试构建执行器，兼容可能的参数名
  let runner;
  try {
    runner = await createRunner({ widgetFile, file: widgetFile, entry: widgetFile });
  } catch {
    runner = await createRunner(widgetFile);
  }

  if (!runner) {
    console.error('runner 创建失败。');
    process.exit(3);
  }

  // 兼容不同 runner 调用方式
  const runMethod = runner.run || runner.invoke || runner.callModule || null;
  if (!runMethod) {
    console.error('runner 缺少可调用方法（run/invoke/callModule）。');
    process.exit(4);
  }

  // 1) search
  const searchResult = await runMethod.call(runner, {
    functionName: 'search',
    name: 'search',
    module: 'search',
    params: { keyword, from },
  }).catch(async () => {
    // 兜底参数结构
    return runMethod.call(runner, 'search', { keyword, from });
  });
  printResult('search()', searchResult);

  // 2) loadPage（热门）
  const hotUrl = 'https://jable.tv/hot/?mode=async&function=get_block&block_id=list_videos_common_videos_list';
  const pageResult = await runMethod.call(runner, {
    functionName: 'loadPage',
    name: 'loadPage',
    module: 'loadPage',
    params: { url: hotUrl, from },
  }).catch(async () => {
    return runMethod.call(runner, 'loadPage', { url: hotUrl, from });
  });
  printResult('loadPage()', pageResult);

  // 3) loadDetail
  const detailLink = manualDetailLink || pickFirstLink(Array.isArray(pageResult) ? pageResult : searchResult);
  if (!detailLink) {
    console.warn('\n未找到可用详情链接，跳过 loadDetail。可通过 JAV_DETAIL_LINK 指定。');
    return;
  }

  const detailResult = await runMethod.call(runner, {
    functionName: 'loadDetail',
    name: 'loadDetail',
    module: 'loadDetail',
    params: detailLink,
    link: detailLink,
  }).catch(async () => {
    return runMethod.call(runner, 'loadDetail', detailLink);
  });
  printResult('loadDetail()', detailResult);
}

main().catch((error) => {
  console.error('\n测试程序执行失败：', error?.stack || error);
  process.exit(99);
});
