// ============================================================================
// 预处理清洗 — F6 原文预处理清洗
// 去除广告、章节尾注、ePub 元数据等干扰内容
// ============================================================================

/**
 * 对小说原文进行预处理清洗
 * 去除干扰内容，保留正文
 */
export function cleanNovel(text: string): string {
  let cleaned = text;

  // 1. 去除 ePub 电子书平台广告行
  cleaned = cleaned.replace(/^\s*本书由「ePUBw\.COM」整理[^\n]*$/gm, '');
  cleaned = cleaned.replace(/^\s*本書由「ePUBw\.COM」整理[^\n]*$/gm, '');
  cleaned = cleaned.replace(/^\s*ePUBw\.COM 提供[^\n]*$/gm, '');

  // 2. 去除 Table of Contents 及其后面的空行（目录标记）
  cleaned = cleaned.replace(/^\s*Table of Contents\s*$/gim, '');

  // 3. 去除 URL 链接
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

  // 4. 去除 QQ 号、微信号
  cleaned = cleaned.replace(/[Qq][Qq][：:\s]*\d{5,15}/g, '');
  cleaned = cleaned.replace(/微信[：:号\s]*[a-zA-Z0-9_-]{6,}/g, '');

  // 5. 去除电话/手机号
  cleaned = cleaned.replace(/1[3-9]\d{9}/g, '');

  // 6. 去除纯符号分隔行
  cleaned = cleaned.replace(/^[-=\*#~]{3,}\s*$/gm, '');

  // 7. 合并连续空行（最多保留连续 2 个空行）
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 8. 去除首尾空白
  cleaned = cleaned.trim();

  return cleaned;
}
