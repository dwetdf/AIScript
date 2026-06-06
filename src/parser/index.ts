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
 * 从文件内容或文件名中提取标题
 * 优先级：文件名 > 第一行文本（短标题候选） > 文件名去扩展名
 */
function extractTitle(text: string, fallback: string): string {
  // 从文件名提取（去掉扩展名），这是最可靠的书名来源
  const nameFromFile = fallback.replace(/\.[^.]+$/, '');

  // 如果文件名看起来像有意义的名字（不是纯数字/随机字符），直接用它
  if (nameFromFile.length >= 2 && !/^[\d_-]+$/.test(nameFromFile)) {
    return nameFromFile;
  }

  // 否则尝试从文本第一行提取
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 15 && !/^第[一二三四五六七八九十百千\d]+[章节回]/.test(firstLine)) {
      return firstLine;
    }
  }

  return nameFromFile;
}

// Re-export types
export type { Chapter, Paragraph };
