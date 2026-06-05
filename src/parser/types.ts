// ============================================================================
// Parser 内部类型定义
// ============================================================================

export interface Chapter {
  chapterNumber: number;
  title?: string;
  paragraphs: Paragraph[];
}

export interface ChapterData {
  chapterNumber: number;
  title?: string;
  paragraphs: ParagraphData[];
}

export interface ParagraphData {
  index: number;
  text: string;
}

export interface Paragraph {
  index: number;
  text: string;
}
