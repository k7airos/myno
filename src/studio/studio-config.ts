import { getPluginDocs, type WechatPluginDoc } from "@akairos/milkdown-article-plugins";
import { getWechatPreviewTheme, type WechatExportTheme } from "./themes";
import type { ArticleStructure } from "./wechat-renderer";

export interface AccountData {
  name: string;
  customCssPath: string | null;
  customCssContent: string;
  theme: {
    editorVars: Record<string, string>;
    exportTheme: Partial<WechatExportTheme>;
    syntaxPresets?: Record<string, string>;
    structure?: ArticleStructure;
  };
  articleThemeCss?: string;
  articleTheme?: string | null;
  articleThemeStandalone?: boolean;
}

export interface StudioConfigResponse {
  defaultAccount: string;
  accounts: Record<string, AccountData>;
  plugins: WechatPluginDoc[];
  sampleMarkdown: string;
}

/** 独立工作台使用本包主题和语法示例，不带发布账号的署名。 */
export function createLocalStudioConfig(): StudioConfigResponse {
  const theme = getWechatPreviewTheme("default", { exportTheme: { footerText: "" } });
  const plugins = getPluginDocs();
  return {
    defaultAccount: "default",
    accounts: {
      default: {
        name: "本地默认",
        customCssPath: null,
        customCssContent: "",
        theme: { editorVars: { ...theme.editorVars }, exportTheme: { ...theme.exportTheme } },
      },
    },
    plugins,
    sampleMarkdown: [
      "# 微信排版示例",
      "## 从一段文字开始",
      "在这里写下你的内容，调整左侧样式后，可一键复制到公众号，或导出配置供下次使用。",
      "这段正文包含 **加粗**、*斜体*、[链接](https://example.com) 和 `行内代码`。",
      "> 引用可以补充背景，也可以呈现一段值得记住的话。",
      "### 列表与表格",
      "- 写作\n- 调整样式\n- 复制或导出",
      "| 项目 | 说明 |\n| --- | --- |\n| 正文 | 调整字号与行距 |\n| 配置 | 导出为 JSON |",
      "```ts\nconst message = 'Hello, myno';\n```",
      "---",
      ...plugins.map(plugin => `### ${plugin.name}\n\n${plugin.sampleMarkdown}`),
    ].join("\n\n"),
  };
}

/** 宿主配置优先；接口缺失或失败时保留完整的本地工作台。 */
export async function loadStudioConfig(fetchConfig: (input: string, init: RequestInit) => Promise<Response> = fetch): Promise<{
  config: StudioConfigResponse;
  source: "local" | "pipeline";
  error?: string;
}> {
  const local = createLocalStudioConfig();
  try {
    const response = await fetchConfig("/api/studio/config", { signal: AbortSignal.timeout(3000) });
    if (response.status === 404) return { config: local, source: "local" };
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as StudioConfigResponse;
    if (!data?.accounts || typeof data.accounts !== "object" || Array.isArray(data.accounts) || !data.accounts[data.defaultAccount]?.theme) {
      throw new Error("工作台配置缺少有效的默认账号");
    }
    const accounts: Record<string, AccountData> = {};
    for (const [key, account] of Object.entries(data.accounts)) {
      if (!account?.theme) throw new Error(`账号 ${key} 缺少主题配置`);
      const theme = getWechatPreviewTheme("default", {
        editorVars: account.theme.editorVars,
        exportTheme: { footerText: "", ...account.theme.exportTheme },
      });
      accounts[key] = {
        ...local.accounts.default,
        ...account,
        name: account.name || key,
        theme: { ...account.theme, editorVars: { ...theme.editorVars }, exportTheme: { ...theme.exportTheme } },
      };
    }
    return {
      source: "pipeline",
      config: { ...data, accounts, plugins: data.plugins ?? local.plugins, sampleMarkdown: data.sampleMarkdown || local.sampleMarkdown },
    };
  } catch (error) {
    return { config: local, source: "local", error: error instanceof Error ? error.message : String(error) };
  }
}
