// ============================================================================
// Markdown 解析器 — F1 多格式导入
// 使用 marked 解析 Markdown 格式小说
// ============================================================================

/**
 * 解析 Markdown 小说文件
 * 使用 marked 将 Markdown 转为纯文本，同时保留章节标记
 */
export async function parseMarkdown(file: File): Promise<string> {
  const text = await file.text();

  // 简单处理：去除 HTML 标签，保留纯文本
  // 对于小说来说，Markdown 格式比较简单，直接去标记即可
  return text
    .replace(/^#+\s+(.*)$/gm, '$1')          // 标题 → 纯文本
    .replace(/\*\*(.+?)\*\*/g, '$1')          // 粗体 → 纯文本
    .replace(/\*(.+?)\*/g, '$1')               // 斜体 → 纯文本
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')        // 链接 → 显示文字
    .replace(/!\[.*?\]\(.+?\)/g, '')           // 图片 → 删除
    .replace(/^>\s+/gm, '')                     // 引用 →
    .replace(/^[-*]\s+/gm, '')                  // 列表 →
    .replace(/^`{3}.*\n[\s\S]*?\n`{3}/gm, '') // 代码块 → 删除
    .replace(/`(.+?)`/g, '$1')                 // 行内代码 → 纯文本
    .replace(/<[^>]+>/g, '');                  // 任何残留 HTML 标签
}
