// ============================================================================
// DOCX 解析器 — F1 多格式导入
// 使用 mammoth 提取文本 + 保留段落结构
// ============================================================================

/**
 * 解析 DOCX 文件，提取纯文本
 * 使用 mammoth 库提取文档内容，保留段落结构
 */
export async function parseDocx(file: File): Promise<string> {
  // 动态导入 mammoth（较大的浏览器端库）
  const mammoth = await import('mammoth');

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  return result.value;
}
