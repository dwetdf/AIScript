// ============================================================================
// 小说解析入口 — F1 多格式小说导入
// 支持 .txt / .docx / .md 格式自动分发
// ============================================================================

import { parseTxt } from './txt';
import { parseDocx } from './docx';
import { parseMarkdown } from './md';
import { detectChapterBoundaries } from './chapter-detector';
import { cleanNovel } from './cleaner';
import type { Chapter, Paragraph, ChapterData, ParagraphData } from './types';

/** 解析后的小说结构 */
export interface ParsedNovel {
  title: string;
  author?: string;
  chapters: ChapterData[];
  rawText: string;
}

// Re-export for consumers
export type { ChapterData, ParagraphData };

/**
 * 多格式小说导入主入口
 * 根据文件类型自动分发到对应解析器
 */
export async function parseNovel(file: File): Promise<ParsedNovel> {
  const ext = getFileExtension(file.name);
  let rawText: string;
  let chapters: ChapterData[];

  switch (ext) {
    case '.txt':
      rawText = await parseTxt(file);
      break;
    case '.docx':
      rawText = await parseDocx(file);
      break;
    case '.md':
      rawText = await parseMarkdown(file);
      break;
    default:
      throw new Error(`不支持的文件格式: ${ext}。支持的格式: .txt / .docx / .md`);
  }

  // 预处理清洗
  rawText = cleanNovel(rawText);

  // 章节识别
  chapters = detectChapterBoundaries(rawText);

  if (chapters.length < 3) {
    console.warn('检测到的章节数少于 3 章，请确认文件是否包含完整的章节标记');
  }

  // 提取标题和作者（从文件内容推断）
  const title = extractTitle(rawText, file.name);

  return {
    title,
    chapters,
    rawText,
  };
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.substring(dot).toLowerCase() : '';
}

/**
 * 从文本中提取标题
 */
function extractTitle(text: string, fallback: string): string {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // 如果第一行较短（<30字），可能是标题
    if (firstLine.length < 30) {
      return firstLine;
    }
    return firstLine.substring(0, 30) + '…';
  }
  return fallback.replace(/\.[^.]+$/, '');
}

// Re-export types
export type { Chapter, Paragraph };
