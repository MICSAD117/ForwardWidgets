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
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetFile = path.join(__dirname, 'jav.js');

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

async function importLibs() {
  const attempts = [];
  const candidates = [
    '@forward-widget/libs',
    '@forward-widget/libs/node',
    '@forward-widget/libs/runner',
    '@forward-widget/libs/index',
    '@forward-widget/libs/index.js',
  ];

  for (const specifier of candidates) {
    try {
      const loaded = await import(specifier);
      return { libs: loaded, specifier };
    } catch (error) {
      attempts.push(`${specifier}: ${error?.message || error}`);
    }
  }

  // 某些版本可能未在 exports 暴露根入口，回退到读取 package.json 后按文件路径加载。
  const pkgPath = path.join(process.cwd(), 'node_modules', '@forward-widget', 'libs', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const exportsField = pkg?.exports && typeof pkg.exports === 'object' ? pkg.exports : {};
    const exportKeys = Object.keys(exportsField);
    const preferredExport = exportKeys.find((key) => key === '.' || key === './node' || key === './runner') || exportKeys[0];
    const target = preferredExport ? exportsField[preferredExport] : null;
    const targetPath = typeof target === 'string' ? target : target?.import || target?.default || null;

    if (targetPath) {
      const absoluteFile = path.resolve(path.dirname(pkgPath), targetPath);
      if (fs.existsSync(absoluteFile)) {
        try {
          const loaded = await import(pathToFileURL(absoluteFile).href);
          return { libs: loaded, specifier: absoluteFile };
        } catch (error) {
          attempts.push(`${absoluteFile}: ${error?.message || error}`);
        }
      }
    }
  }

  throw new Error(attempts.join('\n'));
}

async function main() {
  let libs;
  let usedSpecifier = '';
  try {
    const imported = await importLibs();
    libs = imported.libs;
    usedSpecifier = imported.specifier;
  } catch (error) {
    console.error('未找到 @forward-widget/libs，请先安装后再运行：');
    console.error('  npm i -D @forward-widget/libs');
    console.error('如仍失败，尝试：npm i -D @forward-widget/libs@latest');
    console.error('\n原始错误：', error?.message || error);
    process.exit(1);
  }

  const availableExports = Object.keys(libs).sort();
  console.log(`已加载 @forward-widget/libs（入口：${usedSpecifier}），可用导出：`, availableExports.join(', '));

  // 兼容不同版本 API：优先尝试常见 runner 创建函数
  const createRunner =
    libs.createWidgetRunner ||
    libs.createForwardWidgetRunner ||
    libs.createRunner ||
    libs.createWidgetExecutor ||
    null;

  // 尝试构建执行器，兼容可能的参数名
  let runner;
  if (createRunner) {
    try {
      runner = await createRunner({ widgetFile, file: widgetFile, entry: widgetFile });
    } catch {
      runner = await createRunner(widgetFile);
    }
  }

  // 兼容只导出 WidgetAdaptor 的版本
  const WidgetAdaptor = libs.WidgetAdaptor || libs.WidgetAdapter || null;
  if (!runner && WidgetAdaptor) {
    const adaptorCtorParams = [
      { widgetFile, file: widgetFile, entry: widgetFile },
      { widgetFile },
      { file: widgetFile },
      { entry: widgetFile },
      widgetFile,
      undefined,
    ];
    for (const param of adaptorCtorParams) {
      try {
        runner = typeof param === 'undefined' ? new WidgetAdaptor() : new WidgetAdaptor(param);
        if (runner) break;
      } catch {
        // 忽略，尝试下一种构造参数
      }
    }
  }

  if (!runner) {
    console.error('\n无法识别 @forward-widget/libs 的 runner 创建 API。');
    console.error('请检查导出并按当前版本调整：', availableExports);
    process.exit(2);
  }

  if (!runner) {
    console.error('runner 创建失败。');
    process.exit(3);
  }

  // 兼容不同 runner 调用方式
  const runMethod =
    runner.run ||
    runner.invoke ||
    runner.callModule ||
    runner.execute ||
    runner.call ||
    runner.runFunction ||
    null;
  if (!runMethod) {
    if (typeof runner.search !== 'function' || typeof runner.loadPage !== 'function' || typeof runner.loadDetail !== 'function') {
      console.error('runner 缺少可调用方法（run/invoke/callModule/execute/call/runFunction）。');
      process.exit(4);
    }
  }

  const invokeRunner = async (functionName, params) => {
    if (runMethod) {
      return runMethod.call(runner, {
        functionName,
        name: functionName,
        module: functionName,
        params,
        link: functionName === 'loadDetail' ? params : undefined,
      }).catch(async () => {
        return runMethod.call(runner, functionName, params);
      });
    }
    return runner[functionName](params);
  };

  // 1) search
  const searchResult = await invokeRunner('search', { keyword, from });
  printResult('search()', searchResult);

  // 2) loadPage（热门）
  const hotUrl = 'https://jable.tv/hot/?mode=async&function=get_block&block_id=list_videos_common_videos_list';
  const pageResult = await invokeRunner('loadPage', { url: hotUrl, from });
  printResult('loadPage()', pageResult);

  // 3) loadDetail
  const detailLink = manualDetailLink || pickFirstLink(Array.isArray(pageResult) ? pageResult : searchResult);
  if (!detailLink) {
    console.warn('\n未找到可用详情链接，跳过 loadDetail。可通过 JAV_DETAIL_LINK 指定。');
    return;
  }

  const detailResult = await invokeRunner('loadDetail', detailLink);
  printResult('loadDetail()', detailResult);
}

main().catch((error) => {
  console.error('\n测试程序执行失败：', error?.stack || error);
  process.exit(99);
});
