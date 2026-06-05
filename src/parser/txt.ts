// ============================================================================
// TXT 解析器 — F1 多格式导入 / F4 编码检测
// ============================================================================

import { detectEncoding, decodeBytes } from './encoding';

/**
 * 解析 TXT 文件，自动检测编码
 */
export async function parseTxt(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 检测编码
  const encoding = detectEncoding(bytes);

  // 解码文本
  return decodeBytes(bytes, encoding);
}
