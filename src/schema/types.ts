// ============================================================================
// Schema 类型定义 — 从三个 YAML Schema 文件派生
// novel-analysis.schema.yaml v1.1.0 → 阶段 1 产物
// adaptation-plan.schema.yaml v1.1.0 → 阶段 2 产物
// screenplay.schema.yaml v1.1.0 → 阶段 3 产物
// ============================================================================

// ============================== 公共类型 ======================================

/** AI 引擎配置 — 三个阶段共用，确保同源 */
export interface AiConfig {
  ai_provider: 'deepseek' | 'openai' | 'anthropic' | 'zhipu' | 'moonshot' | 'custom';
  /** 默认模型 — 用于阶段 1 Tier2 全文综合、阶段 2、阶段 3 等重度任务 */
  ai_model: string;
  /** 轻任务模型 — 用于阶段 1 Tier1 逐章分析等轻量并行任务。不填则自动从默认模型推导快速变体 */
  tier1_model?: string;
  ai_api_base_url?: string;
}

/** 转换参数配置 */
export interface ConversionConfig {
  dialogue_density: 'sparse' | 'balanced' | 'dense';
  action_detail_level: 'minimal' | 'standard' | 'detailed';
  stage_direction_style: 'concise' | 'descriptive';
  target_medium: 'film' | 'tv_series' | 'web_series' | 'stage_play' | 'audio_drama';
  /** 目标篇幅 — 粗粒度指引，AI 据此推算场景密度和节奏分配 */
  target_duration?: 'short' | 'mid' | 'standard' | 'feature' | 'extended';
  tone: 'serious' | 'comedic' | 'dark' | 'lighthearted' | 'epic' | 'intimate' | 'mixed';
  /** 改编忠实度 — 影响人物取舍、情节删改力度 */
  adaptation_fidelity: 'faithful' | 'balanced' | 'bold' | 'inspired';
  rating?: 'G' | 'PG' | 'PG_13' | 'R' | 'NC_17' | 'unrated' | 'CN_general' | 'CN_restricted';
  total_episodes?: number;
  /** 用户自定义补充指令 — 注入到阶段2的 Prompt 中 */
  custom_instructions?: string;
  /** 阶段 3 专用补充指令 — 注入到 Beat 展开的 Prompt 中（优先级高于 custom_instructions） */
  stage3_custom_instructions?: string;
}

/** Schema 校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================== 阶段 1：NovelAnalysis ==============================

export interface NovelAnalysis {
  schema_version: string;
  source_info: SourceInfo;
  /** F7 主题分析 */
  theme_analysis?: ThemeAnalysis;
  /** F8 世界观分析 */
  world_building?: WorldBuilding;
  /** F9-F13 剧情分析 */
  plot_analysis: PlotAnalysis;
  /** F14-F17 人物分析 */
  character_analysis: CharacterAnalysis[];
  /** F18 章节摘要 */
  chapter_summaries: ChapterSummary[];
  /** F18-bis AI 精选原文片段 — 防漂移机制第一层，替代 raw_passages */
  curated_passages: CuratedPassage[];
  ai_config?: AiConfig;
  generated_at?: string;
}

export interface SourceInfo {
  title: string;
  author: string;
  source_type?: 'novel' | 'web_novel' | 'short_story' | 'comic' | 'other';
  total_chapters: number;
  analyzed_chapters?: {
    start_chapter: number;
    end_chapter: number;
  };
  language?: string;
  word_count?: number;
}

export interface ThemeAnalysis {
  core_themes: Array<{ theme: string; description: string; embodied_by?: string[] }>;
  secondary_themes?: Array<{ theme: string; description: string }>;
  tonal_characteristics?: string[];
}

export interface WorldBuilding {
  era?: string;
  setting_scale?: 'single_location' | 'city' | 'region' | 'nation' | 'multi_nation' | 'world' | 'universe';
  key_locations?: Array<{ name: string; significance: string; associated_characters?: string[] }>;
  power_system?: string;
  rules_and_constraints?: string[];
  atmosphere?: string;
}

export interface PlotAnalysis {
  main_plot: { description: string; stakes: string };
  sub_plots?: Array<{ description: string; connection_to_main: string; key_characters?: string[] }>;
  core_conflict: CoreConflict;
  key_events: KeyEvent[];
  narrative_structure?: NarrativeStructure;
}

export interface CoreConflict {
  type: 'person_vs_person' | 'person_vs_society' | 'person_vs_nature' | 'person_vs_self' | 'person_vs_technology' | 'person_vs_fate' | 'mixed';
  description: string;
  conflict_layers?: Array<{ layer: string; description: string }>;
}

export interface KeyEvent {
  event: string;
  chapter: number;
  description: string;
  dramatic_function?: 'inciting_incident' | 'plot_point_1' | 'midpoint' | 'plot_point_2' | 'climax' | 'resolution' | 'other';
}

export interface NarrativeStructure {
  timeline_type?: 'linear' | 'nonlinear' | 'parallel' | 'framed' | 'reverse' | 'mixed';
  pov_type?: 'single' | 'multiple' | 'omniscient' | 'first_person' | 'mixed';
  narrative_devices?: string[];
  pacing_summary?: string;
}

export interface CharacterAnalysis {
  /** F14 人物唯一标识 — snake_case 拼音 */
  character_id: string;
  name: string;
  aliases?: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'narrator' | 'ensemble';
  /** F16 人物重要性评级 */
  importance: 'essential' | 'major' | 'supporting' | 'minor' | 'cameo';
  identity?: string;
  motivation?: { external: string; internal: string };
  character_arc?: string;
  relationships?: CharacterRelation[];
  /** F15 人物特征 */
  distinctive_traits?: {
    speech_style?: string;
    catchphrases?: string[];
    habits?: string[];
    appearance?: string;
  };
  /** F17 改编适用性分析 */
  adaptability_notes?: string;
}

export interface CharacterRelation {
  target_character_id: string;
  type: 'ally' | 'enemy' | 'lover' | 'family' | 'mentor' | 'student' | 'colleague' | 'rival' | 'ambiguous' | 'other';
  description: string;
  dynamics?: string;
}

export interface ChapterSummary {
  chapter_number: number;
  chapter_title?: string;
  summary: string;
  key_events?: string[];
  characters_appeared?: string[];
  locations?: string[];
  paragraph_count?: number;
  adaptation_potential?: 'high' | 'medium' | 'low' | 'skip';
}

/** F18-bis AI 精选原文片段 — 替代全量 raw_passages */
export interface CuratedPassage {
  /** 原文摘录（≤200字） */
  text: string;
  /** 片段类型 */
  passage_type: 'dialogue' | 'action' | 'description' | 'character_moment';
  /** 关联人物名 */
  characters_involved?: string[];
  /** 所属章节 */
  source_chapter: number;
  /** 段落序号（章节内从 1 开始） */
  source_paragraph?: number;
  /** AI 标注：为什么值得保留 */
  why_valuable?: string;
}

// ============================== 阶段 2：AdaptationPlan ==============================

export interface AdaptationPlan {
  schema_version: string;
  source_analysis_ref?: {
    analysis_file?: string;
    analysis_generated_at?: string;
    chapters_covered?: { start_chapter: number; end_chapter: number };
  };
  adaptation_strategy: AdaptationStrategy;
  episode_plan: EpisodePlan;
  /** F26-F28 分场景大纲 */
  scene_plan: ScenePlan[];
  /** F29 人物表初稿 */
  characters_draft?: CharacterDraft[];
  /** F30 地点表初稿 */
  locations_draft?: LocationDraft[];
  ai_config?: AiConfig;
  generated_at?: string;
}

export interface AdaptationStrategy {
  target_medium: 'film' | 'tv_series' | 'web_series' | 'stage_play' | 'audio_drama';
  /** F19 基调映射 */
  tone_adaptation: { source_tone: string; target_tone: string; notes: string };
  /** F20 结构改编决策 */
  structural_decisions: StructuralDecision[];
  /** F21 人物改编决策 */
  character_adaptations?: CharacterAdaptation[];
  /** F22 节奏规划 */
  pacing_strategy?: PacingStrategy;
  /** F23 外化策略 */
  externalization_strategy?: string;
  /** F24 压缩规则 */
  compression_rules?: CompressionRule[];
}

export interface StructuralDecision {
  decision: string;
  rationale: string;
  impact: 'high' | 'medium' | 'low';
  affected_characters?: string[];
  affected_chapters?: number[];
}

export interface CharacterAdaptation {
  character_id: string;
  action: 'keep' | 'merge' | 'reduce' | 'expand' | 'cut';
  merge_with?: string;
  notes?: string;
}

export interface PacingStrategy {
  overall_pacing?: 'fast' | 'moderate' | 'slow' | 'varied';
  high_tension_ratio?: number;
  breathing_room?: string;
}

export interface CompressionRule {
  rule: string;
  applies_to: 'environment' | 'action' | 'dialogue' | 'all';
  priority?: 'must' | 'should' | 'may';
}

export interface EpisodePlan {
  total_acts: number;
  acts: ActPlan[];
}

export interface ActPlan {
  act_number: number;
  act_title?: string;
  act_type: 'setup' | 'confrontation' | 'resolution' | 'other';
  synopsis: string;
  estimated_scene_count?: number;
  estimated_duration_minutes?: number;
  key_moments?: Array<{ moment: string; from_chapter: number; dramatic_function?: string }>;
  source_chapters?: number[];
}

export interface ScenePlan {
  scene_global_number: number;
  act_number: number;
  scene_number: number;
  location: { location_id?: string; name: string; interior_exterior: 'INT' | 'EXT' | 'INT_EXT'; set_description?: string };
  time_of_day: string;
  synopsis: string;
  dramatic_function: 'inciting_incident' | 'plot_point' | 'midpoint' | 'climax' | 'exposition' | 'character_moment' | 'action' | 'transition' | 'other';
  tension_level?: number;
  characters_present?: string[];
  source_chapter_ref?: string;
  /** F27 场景原文上下文 — 防漂移机制第二层 */
  source_context?: SourceContext;
  estimated_duration_seconds?: number;
  /** F28 beat 规划 */
  beat_plan?: BeatPlan;
}

export interface SourceContext {
  summary: string;
  key_dialogues?: Array<{ speaker: string; text: string; context_note?: string }>;
  key_actions?: Array<{ description: string }>;
  key_descriptions?: string[];
  adaptation_notes?: string;
}

export interface BeatPlan {
  estimated_beat_count?: number;
  key_beats?: Array<{
    order: number;
    beat_type?: string;
    description: string;
    character_id?: string;
    from_source?: boolean;
  }>;
  notes?: string;
}

export interface CharacterDraft {
  character_id: string;
  name: string;
  aliases?: string[];
  role_type: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'narrator' | 'ensemble';
  description?: string;
  arc?: string;
  relationships?: Array<{
    target_character_id: string;
    relationship_type: string;
    relationship_description?: string;
  }>;
  voice_notes?: string;
}

export interface LocationDraft {
  location_id: string;
  name: string;
  location_type?: 'interior' | 'exterior' | 'mixed';
  description?: string;
  parent_location_id?: string;
}

// ============================== 阶段 3：Screenplay ==============================

export interface Screenplay {
  schema_version: string;
  revision_history?: RevisionEntry[];
  metadata: ScreenplayMetadata;
  characters: Character[];
  locations?: Location[];
  acts: Act[];
  production_notes?: ProductionNotes;
}

export interface RevisionEntry {
  revision_number: number;
  timestamp: string;
  author?: string;
  change_summary: string;
  changed_beats?: string[];
}

export interface ScreenplayMetadata {
  title: string;
  original_title?: string;
  author?: string;
  source_type?: 'novel' | 'web_novel' | 'short_story' | 'comic' | 'other';
  target_medium: 'film' | 'tv_series' | 'web_series' | 'stage_play' | 'audio_drama';
  episode_info?: { episode_number: number; episode_title?: string; total_episodes?: number; season?: number };
  language: string;
  genre?: string[];
  tone?: 'serious' | 'comedic' | 'dark' | 'lighthearted' | 'epic' | 'intimate' | 'mixed';
  rating?: 'G' | 'PG' | 'PG_13' | 'R' | 'NC_17' | 'unrated' | 'CN_general' | 'CN_restricted';
  source_chapters?: { start_chapter: number; end_chapter: number; chapter_titles?: string[] };
  estimated_runtime_minutes?: number;
  conversion_config?: {
    ai_provider?: string;
    ai_model?: string;
    ai_api_base_url?: string;
    dialogue_density?: 'sparse' | 'balanced' | 'dense';
    action_detail_level?: 'minimal' | 'standard' | 'detailed';
    stage_direction_style?: 'concise' | 'descriptive';
    ai_model_display?: string;
    prompt_version?: string;
  };
  generated_at: string;
  last_modified_at?: string;
  notes?: string;
}

export interface Character {
  character_id: string;
  name: string;
  aliases?: string[];
  role_type: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'narrator' | 'ensemble';
  gender?: 'male' | 'female' | 'non_binary' | 'unknown';
  age_range?: string;
  description?: string;
  arc?: string;
  first_appearance?: { act_number: number; scene_global_number: number };
  relationships?: Array<{
    target_character_id: string;
    relationship_type: string;
    relationship_description?: string;
  }>;
  voice_notes?: string;
}

export interface Location {
  location_id: string;
  name: string;
  location_type?: 'interior' | 'exterior' | 'mixed';
  description?: string;
  parent_location_id?: string;
}

export interface Act {
  act_number: number;
  act_title?: string;
  act_type?: 'setup' | 'confrontation' | 'resolution' | 'other';
  synopsis?: string;
  scenes: Scene[];
}

export interface Scene {
  scene_number: number;
  scene_global_number: number;
  location: { location_id?: string; name: string; interior_exterior: 'INT' | 'EXT' | 'INT_EXT'; set_description?: string };
  time_of_day: string;
  scene_heading?: string;
  scene_heading_override?: boolean;
  source_chapter_ref?: string;
  synopsis?: string;
  dramatic_function?: string;
  tension_level?: number;
  characters_present?: string[];
  props?: Array<{ name: string; significance?: string }>;
  estimated_duration_seconds?: number;
  continuity_notes?: string;
  beats: Beat[];
}

/** Beat 公共属性 */
export interface BeatBase {
  beat_id: string;
  beat_type: BeatType;
  emotion?: string;
  camera_suggestion?: string;
  source_ref?: { chapter: number; paragraph: number; excerpt?: string };
  source_text_ref?: string;
  is_ai_generated?: boolean;
  editorial_note?: string;
  estimated_duration_seconds?: number;
  music_cue?: string;
}

export type BeatType =
  | 'action' | 'dialogue' | 'parenthetical' | 'transition'
  | 'title_card' | 'voice_over' | 'off_screen'
  | 'montage_start' | 'montage_end'
  | 'flashback_start' | 'flashback_end'
  | 'insert';

/** 对白类 Beat（dialogue / voice_over / off_screen） */
export interface DialogueBeat extends BeatBase {
  beat_type: 'dialogue' | 'voice_over' | 'off_screen';
  character_id: string;
  character_name_display?: string;
  dialogue_text: string;
}

/** 动作类 Beat */
export interface ActionBeat extends BeatBase {
  beat_type: 'action';
  action_text: string;
  character_id?: string;
}

/** 括注类 Beat */
export interface ParentheticalBeat extends BeatBase {
  beat_type: 'parenthetical';
  character_id: string;
  character_name_display?: string;
  parenthetical_text: string;
}

/** 转场类 Beat */
export interface TransitionBeat extends BeatBase {
  beat_type: 'transition';
  transition_type: 'CUT_TO' | 'FADE_IN' | 'FADE_OUT' | 'FADE_TO_BLACK' | 'DISSOLVE_TO' | 'SMASH_CUT' | 'MATCH_CUT' | 'WIPE_TO' | 'IRIS_IN' | 'IRIS_OUT' | 'TIME_CUT';
}

/** 字幕卡类 Beat */
export interface TitleCardBeat extends BeatBase {
  beat_type: 'title_card';
  title_card_text: string;
}

/** 插入镜头类 Beat */
export interface InsertBeat extends BeatBase {
  beat_type: 'insert';
  insert_description: string;
}

/** 蒙太奇开始 Beat */
export interface MontageStartBeat extends BeatBase {
  beat_type: 'montage_start';
}

/** 蒙太奇结束 Beat */
export interface MontageEndBeat extends BeatBase {
  beat_type: 'montage_end';
}

/** 闪回开始 Beat */
export interface FlashbackStartBeat extends BeatBase {
  beat_type: 'flashback_start';
  flashback_label: string;
}

/** 闪回结束 Beat */
export interface FlashbackEndBeat extends BeatBase {
  beat_type: 'flashback_end';
}

/** 联合类型：所有可能的 Beat */
export type Beat =
  | DialogueBeat
  | ActionBeat
  | ParentheticalBeat
  | TransitionBeat
  | TitleCardBeat
  | InsertBeat
  | MontageStartBeat
  | MontageEndBeat
  | FlashbackStartBeat
  | FlashbackEndBeat;

export interface ProductionNotes {
  adaptation_decisions?: Array<{ decision: string; rationale: string }>;
  unresolved_items?: string[];
  suggested_music_cues?: Array<{ scene_global_number: number; suggestion: string }>;
}
