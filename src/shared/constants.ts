// ============================================================================
// 公共常量 — 所有枚举值、默认配置、Provider 列表、AI 模型映射
// ============================================================================

import type { AiConfig, ConversionConfig } from '../schema/types';

// ============================== AI Provider  ==============================

export const AI_PROVIDERS = ['deepseek', 'openai', 'anthropic', 'zhipu', 'moonshot', 'custom'] as const;

export const AI_PROVIDER_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  zhipu: '智谱 AI',
  moonshot: '月之暗面 (Moonshot)',
  custom: '自定义 API',
};

export const AI_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o3-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514'],
  zhipu: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  custom: [],
};

export const AI_API_ENDPOINTS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  moonshot: 'https://api.moonshot.cn/v1/chat/completions',
  custom: '',
};

// ============================== 默认 AI 配置 ==============================

export const DEFAULT_AI_CONFIG: AiConfig = {
  ai_provider: 'deepseek',
  ai_model: 'deepseek-v4-pro',
};

// ============================== 默认转换配置 ==============================

export const DEFAULT_CONVERSION_CONFIG: ConversionConfig = {
  dialogue_density: 'balanced',
  action_detail_level: 'standard',
  stage_direction_style: 'concise',
  target_medium: 'film',
  target_duration: 'standard',
  tone: 'mixed',
  adaptation_fidelity: 'balanced',
};

// ============================== 媒介参数 ==============================

export const MEDIUM_LABELS: Record<string, string> = {
  film: '电影',
  tv_series: '电视剧',
  web_series: '网络剧',
  stage_play: '舞台剧',
  audio_drama: '广播剧',
};

export const MEDIUM_DEFAULT_DURATIONS: Record<string, number> = {
  film: 120,
  tv_series: 45,
  web_series: 15,
  stage_play: 90,
  audio_drama: 30,
};

// ============================== 目标篇幅 ==============================

export const DURATION_OPTIONS = [
  'short', 'mid', 'standard', 'feature', 'extended',
] as const;

export const DURATION_LABELS: Record<string, string> = {
  short: '短篇（约20-30分钟）',
  mid: '中篇（约45-60分钟）',
  standard: '标准（约90分钟）',
  feature: '长片（约120分钟）',
  extended: '超长（约150分钟以上）',
};

// ============================== 类型筛选 ==============================

export const GENRE_OPTIONS = [
  'action', 'adventure', 'comedy', 'crime', 'drama', 'fantasy',
  'historical', 'horror', 'mystery', 'romance', 'sci_fi',
  'thriller', 'wuxia', 'xianxia', 'suspense', 'other',
] as const;

export const GENRE_LABELS: Record<string, string> = {
  action: '动作',
  adventure: '冒险',
  comedy: '喜剧',
  crime: '犯罪',
  drama: '剧情',
  fantasy: '奇幻',
  historical: '历史',
  horror: '恐怖',
  mystery: '悬疑',
  romance: '爱情',
  sci_fi: '科幻',
  thriller: '惊悚',
  wuxia: '武侠',
  xianxia: '仙侠',
  suspense: '悬念',
  other: '其他',
};

// ============================== 基调选项 ==============================

export const TONE_OPTIONS = [
  'serious', 'comedic', 'dark', 'lighthearted', 'epic', 'intimate', 'mixed',
] as const;

export const TONE_LABELS: Record<string, string> = {
  serious: '严肃',
  comedic: '喜剧',
  dark: '暗黑',
  lighthearted: '轻松',
  epic: '史诗',
  intimate: '亲密',
  mixed: '标准',
};

// ============================== 改编忠实度 ==============================

export const FIDELITY_OPTIONS = [
  'faithful', 'balanced', 'bold', 'inspired',
] as const;

export const FIDELITY_LABELS: Record<string, string> = {
  faithful: '忠实改编 — 保留原著结构和人物，仅做影视化必要调整',
  balanced: '适度重构 — 保留核心情节和人物，合并支线、调整节奏',
  bold: '大幅重构 — 以原著为核心素材重新组织叙事结构',
  inspired: '只取创意 — 仅保留世界观/核心设定，剧情和人物大幅原创',
};

// ============================== 分级选项 ==============================

export const RATING_OPTIONS = [
  'G', 'PG', 'PG_13', 'R', 'NC_17', 'unrated', 'CN_general', 'CN_restricted',
] as const;

// ============================== 对白密度选项 ==============================

export const DIALOGUE_DENSITY_OPTIONS = ['sparse', 'balanced', 'dense'] as const;
export const DIALOGUE_DENSITY_LABELS: Record<string, string> = {
  sparse: '稀疏',
  balanced: '均衡',
  dense: '密集',
};

// ============================== 动作详细度选项 ==============================

export const ACTION_DETAIL_OPTIONS = ['minimal', 'standard', 'detailed'] as const;
export const ACTION_DETAIL_LABELS: Record<string, string> = {
  minimal: '简洁',
  standard: '标准',
  detailed: '详细',
};

// ============================== 舞台指示风格选项 ==============================

export const STAGE_DIRECTION_OPTIONS = ['concise', 'descriptive'] as const;
export const STAGE_DIRECTION_LABELS: Record<string, string> = {
  concise: '简洁',
  descriptive: '描述性',
};

// ============================== Beat 展开并发 ==============================

/** Beat 展开时 AI API 默认并发数 */
export const DEFAULT_BEAT_EXPANSION_CONCURRENCY = 5;

/** Beat 展开最大并发数（防止触发 API 限流） */
export const MAX_BEAT_EXPANSION_CONCURRENCY = 10;

// ============================== 分块分析 ==============================

/** 阶段 1 分块分析：每块包含的章节数 */
export const DEFAULT_CHUNK_SIZE = 5;

/** 阶段 1 分块分析：并行处理块的最大并发数 */
export const DEFAULT_STAGE1_CONCURRENCY = 4;

/** 分块分析的触发阈值：章节数 > 此值才分块 */
export const CHUNK_THRESHOLD = 3;

/** 阶段 1 单次/分块 API 调用超时时间 (ms) */
export const STAGE1_API_TIMEOUT_MS = 120_000;

/** 阶段 2 单次 API 调用超时时间 (ms) */
export const STAGE2_API_TIMEOUT_MS = 120_000;

/** 阶段 3 单场景 API 调用超时时间 (ms) */
export const STAGE3_API_TIMEOUT_MS = 90_000;

// ============================== Beat 类型 ==============================

export const BEAT_TYPES = [
  'action', 'dialogue', 'parenthetical', 'transition',
  'title_card', 'voice_over', 'off_screen',
  'montage_start', 'montage_end',
  'flashback_start', 'flashback_end',
  'insert',
] as const;

export const BEAT_TYPE_LABELS: Record<string, string> = {
  action: '动作 (Action)',
  dialogue: '对白 (Dialogue)',
  parenthetical: '括注 (Parenthetical)',
  transition: '转场 (Transition)',
  title_card: '字幕卡 (Title Card)',
  voice_over: '画外音 (V.O.)',
  off_screen: '画外音 (O.S.)',
  montage_start: '蒙太奇·开始',
  montage_end: '蒙太奇·结束',
  flashback_start: '闪回·开始',
  flashback_end: '闪回·结束',
  insert: '插入镜头 (Insert)',
};

// ============================== Schema 版本 ==============================

export const SCHEMA_VERSIONS = {
  'novel-analysis': '1.1.0',
  'adaptation-plan': '1.1.0',
  screenplay: '1.1.0',
} as const;

// ============================== 小说导入相关 ==============================

export const SUPPORTED_FILE_EXTENSIONS = ['.txt', '.docx', '.md', '.epub'];
export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.md': 'text/markdown',
  '.epub': 'application/epub+zip',
};

/** 章节标题匹配正则 */
export const CHAPTER_PATTERNS = [
  /^第[〇零一二三四五六七八九十百千\d]+章/,   // "第X章"
  /^第[〇零一二三四五六七八九十百千\d]+[章节回]/, // "第X节"
  /^Chapter\s+\d+/i,                          // "Chapter X"
  /^[#]+\s*第[〇零一二三四五六七八九十百千\d]+/, // "# 第X章" (Markdown)
  /^[#]+\s*Chapter\s+\d+/i,                    // "# Chapter X" (Markdown)
];

/** 章节分割正则（章节间隔 > 3行空行或分隔符） */
export const CHAPTER_SEPARATOR_PATTERNS = [
  /^[-=*]{3,}$/,
  /^[\s]*$/,
];
