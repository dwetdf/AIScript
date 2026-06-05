// ============================================================================
// 章节边界检测器 — F2 分章节识别
// 自动识别章节边界（"第X章"、标题模式、分隔符），≥3 章
// ============================================================================

import { CHAPTER_PATTERNS } from '../shared/constants';
import type { ChapterData } from './index';

/** 不应被识别为新章节的行 — 元数据 / 目录项 */
const META_PATTERNS = [
  /^作者[簡简]介\s*$/,
  /^Table of Contents\s*$/i,
  /^\s*目[次录錄]\s*$/,
];

/**
 * 将小说文本分割为章节
 * 根据中文章节标记识别章节边界
 */
export function detectChapterBoundaries(text: string): ChapterData[] {
  const lines = text.split('\n');
  const chapters: ChapterData[] = [];
  let currentChapter: ChapterData | null = null;
  let paragraphIndex = 0;
  let seenChapterTitles = new Set<string>();
  let inTail = false; // 标记尾部目录区

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过完全空行
    if (trimmed === '') {
      continue;
    }

    // 跳过元数据行
    if (META_PATTERNS.some((p) => p.test(trimmed))) {
      continue;
    }

    // 检测尾部目录区域（连续的短行+章节标记，在文件后半部分出现）
    // Table of Contents 后面的"第一章 第二章..."是目录项而非正文
    const chapterMatch = isChapterStart(trimmed);
    if (chapterMatch) {
      // 如果这个章节标题已经见过 → 是尾部目录重复项，跳过
      if (seenChapterTitles.has(chapterMatch.title)) {
        inTail = true;
        continue;
      }

      // 保存前一个章节
      if (currentChapter && currentChapter.paragraphs.length > 0) {
        chapters.push(currentChapter);
      }

      seenChapterTitles.add(chapterMatch.title);

      // 开始新章节
      currentChapter = {
        chapterNumber: chapters.length + 1,
        title: chapterMatch.title || trimmed,
        paragraphs: [],
      };
      paragraphIndex = 0;
      continue;
    }

    // 尾部目录区：跳过
    if (inTail) continue;

    // 添加当前行到当前章节
    if (currentChapter) {
      paragraphIndex++;
      currentChapter.paragraphs.push({
        index: paragraphIndex,
        text: trimmed,
      });
    } else if (trimmed.length > 0) {
      // 第一个章节标记之前的内容 → 归入"前言"
      paragraphIndex++;
      currentChapter = {
        chapterNumber: 1,
        title: '前言',
        paragraphs: [{ index: paragraphIndex, text: trimmed }],
      };
    }
  }

  // 保存最后一个章节
  if (currentChapter && currentChapter.paragraphs.length > 0) {
    chapters.push(currentChapter);
  }

  // 如果没有检测到任何章节，将全文作为单章
  if (chapters.length === 0) {
    const allParagraphs = lines
      .filter((l) => l.trim())
      .map((text, i) => ({ index: i + 1, text: text.trim() }));
    chapters.push({ chapterNumber: 1, paragraphs: allParagraphs });
  }

  // 过滤掉段落数过少的"假章节"（如前言只有简介行，合并到第一章）
  const filteredChapters = chapters.filter((ch, i) => {
    if (ch.paragraphs.length < 3) {
      // 把内容合并到下一个章节或前一个
      const next = chapters[i + 1];
      if (next) {
        next.paragraphs = [...ch.paragraphs, ...next.paragraphs];
        // 重新编号
        next.paragraphs.forEach((p, idx) => { p.index = idx + 1; });
      }
      return false;
    }
    return true;
  });

  // 重新编号 chapterNumber
  filteredChapters.forEach((ch, i) => {
    ch.chapterNumber = i + 1;
  });

  return filteredChapters.length > 0 ? filteredChapters : chapters;
}

/** 判断一行是否为章节起始 */
function isChapterStart(line: string): { title: string } | null {
  for (const pattern of CHAPTER_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return { title: line };
    }
  }
  return null;
}

/** 提取章节编号 */
export function extractChapterNumber(title: string): number | null {
  const match = title.match(/第([^章章节回]+)[章回]/);
  if (!match) return null;
  const numStr = match[1]!;
  return chineseToArabic(numStr);
}

/** 中文数字 → 阿拉伯数字 */
function chineseToArabic(chinese: string): number {
  const map: Record<string, number> = {
    '零': 0, '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100,
  };
  const arabicNum = parseInt(chinese, 10);
  if (!isNaN(arabicNum)) return arabicNum;
  if (map[chinese]) return map[chinese]!;
  return chinese.split('').reduce((sum, char) => sum + (map[char] || 0), 0);
}
