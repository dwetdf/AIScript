// ============================================================================
// Schema 校验器 — F64 YAML 格式校验
// 基于 ajv + JSON Schema Draft-07 加载三个 YAML Schema
// ============================================================================

import Ajv, { type ValidateFunction } from 'ajv';
import type { NovelAnalysis, AdaptationPlan, Screenplay, ValidationResult } from './types';

// YAML Schema 文件内容的 JSON 版本（直接嵌入，避免运行时加载 YAML 文件）
// 这些是 schema.schema.yaml 文件的 JSON 等价物

let ajv: Ajv;
let validators: Map<string, ValidateFunction>;

function getAjv(): Ajv {
  if (!ajv) {
    ajv = new Ajv({ allErrors: true, strict: false });
    validators = new Map();
  }
  return ajv;
}

/**
 * 验证数据是否符合指定 Schema
 * @returns ValidationResult — valid 为 true 表示通过
 */
export function validate<T>(
  data: unknown,
  schemaName: 'novel-analysis' | 'adaptation-plan' | 'screenplay'
): ValidationResult {
  const ajv = getAjv();

  // 动态编译 Schema（首次调用时编译并缓存）
  if (!validators.has(schemaName)) {
    const schemaJson = getSchemaJson(schemaName);
    if (!schemaJson) {
      return { valid: false, errors: [`未知的 Schema 名称: ${schemaName}`] };
    }
    validators.set(schemaName, ajv.compile(schemaJson));
  }

  const validateFn = validators.get(schemaName)!;
  const valid = validateFn(data) as boolean;

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validateFn.errors || []).map((e) => {
    const path = e.instancePath || '/';
    return `${path}: ${e.message}${e.params ? ` (${JSON.stringify(e.params)})` : ''}`;
  });

  return { valid: false, errors };
}

/**
 * 获取 Schema JSON 定义
 * 从三个 YAML Schema 文件手动转换为 JSON Schema 格式
 * 这避免了对运行时 YAML 解析的依赖
 */
function getSchemaJson(schemaName: string): Record<string, unknown> | null {
  switch (schemaName) {
    case 'novel-analysis':
      return novelAnalysisSchema;
    case 'adaptation-plan':
      return adaptationPlanSchema;
    case 'screenplay':
      return screenplaySchema;
    default:
      return null;
  }
}

// ============================== Novel Analysis Schema ==============================

const novelAnalysisSchema: Record<string, unknown> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['schema_version', 'source_info', 'chapter_summaries', 'character_analysis', 'plot_analysis'],
  properties: {
    schema_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    source_info: {
      type: 'object',
      required: ['title', 'author', 'total_chapters'],
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
        source_type: { type: 'string', enum: ['novel', 'web_novel', 'short_story', 'comic', 'other'] },
        total_chapters: { type: 'integer', minimum: 1 },
        analyzed_chapters: {
          type: 'object',
          properties: {
            start_chapter: { type: 'integer', minimum: 1 },
            end_chapter: { type: 'integer', minimum: 1 },
          },
        },
        language: { type: 'string', pattern: '^[a-z]{2,3}(-[A-Z]{2,3})?$' },
        word_count: { type: 'integer' },
      },
    },
    theme_analysis: { type: 'object' },
    world_building: { type: 'object' },
    plot_analysis: {
      type: 'object',
      required: ['main_plot', 'core_conflict', 'key_events'],
      properties: {
        main_plot: {
          type: 'object',
          required: ['description', 'stakes'],
          properties: {
            description: { type: 'string' },
            stakes: { type: 'string' },
          },
        },
        sub_plots: { type: 'array' },
        core_conflict: {
          type: 'object',
          required: ['type', 'description'],
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
          },
        },
        key_events: { type: 'array' },
        narrative_structure: { type: 'object' },
      },
    },
    character_analysis: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['character_id', 'name', 'role', 'importance'],
        properties: {
          character_id: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['protagonist', 'antagonist', 'supporting', 'minor', 'narrator', 'ensemble'] },
          importance: { type: 'string', enum: ['essential', 'major', 'supporting', 'minor', 'cameo'] },
        },
      },
    },
    chapter_summaries: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['chapter_number', 'summary'],
        properties: {
          chapter_number: { type: 'integer', minimum: 1 },
          chapter_title: { type: 'string' },
          summary: { type: 'string' },
          raw_passages: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
};

// ============================== Adaptation Plan Schema ==============================

const adaptationPlanSchema: Record<string, unknown> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['schema_version', 'adaptation_strategy', 'episode_plan', 'scene_plan'],
  properties: {
    schema_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    adaptation_strategy: {
      type: 'object',
      required: ['target_medium', 'tone_adaptation', 'structural_decisions'],
      properties: {
        target_medium: { type: 'string', enum: ['film', 'tv_series', 'web_series', 'stage_play', 'audio_drama'] },
        tone_adaptation: {
          type: 'object',
          required: ['source_tone', 'target_tone', 'notes'],
          properties: {
            source_tone: { type: 'string' },
            target_tone: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        structural_decisions: { type: 'array' },
      },
    },
    episode_plan: {
      type: 'object',
      required: ['acts'],
      properties: {
        total_acts: { type: 'integer', minimum: 1 },
        acts: { type: 'array', minItems: 1 },
      },
    },
    scene_plan: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['scene_global_number', 'act_number', 'scene_number', 'location', 'time_of_day', 'synopsis', 'dramatic_function'],
        properties: {
          scene_global_number: { type: 'integer', minimum: 1 },
          act_number: { type: 'integer', minimum: 1 },
          scene_number: { type: 'integer', minimum: 1 },
          location: { type: 'object' },
          time_of_day: { type: 'string' },
          synopsis: { type: 'string' },
          dramatic_function: { type: 'string' },
        },
      },
    },
    characters_draft: { type: 'array' },
    locations_draft: { type: 'array' },
  },
};

// ============================== Screenplay Schema ==============================

const screenplaySchema: Record<string, unknown> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['schema_version', 'metadata', 'characters', 'acts'],
  properties: {
    schema_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    metadata: {
      type: 'object',
      required: ['title', 'target_medium', 'language', 'generated_at'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        target_medium: { type: 'string', enum: ['film', 'tv_series', 'web_series', 'stage_play', 'audio_drama'] },
        language: { type: 'string', pattern: '^[a-z]{2,3}(-[A-Z]{2,3})?$' },
        generated_at: { type: 'string' },
      },
    },
    characters: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['character_id', 'name', 'role_type'],
        properties: {
          character_id: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
          name: { type: 'string' },
          role_type: { type: 'string', enum: ['protagonist', 'antagonist', 'supporting', 'minor', 'narrator', 'ensemble'] },
        },
      },
    },
    acts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['act_number'],
        properties: {
          act_number: { type: 'integer', minimum: 1 },
          scenes: {
            type: 'array',
            minItems: 0,
            items: {
              type: 'object',
              required: ['scene_number', 'scene_global_number', 'location', 'time_of_day'],
              properties: {
                scene_number: { type: 'integer', minimum: 1 },
                scene_global_number: { type: 'integer', minimum: 1 },
                location: { type: 'object' },
                time_of_day: { type: 'string' },
                beats: {
                  type: 'array',
                  minItems: 0,
                  items: {
                    type: 'object',
                    required: ['beat_id', 'beat_type'],
                    properties: {
                      beat_id: { type: 'string', pattern: '^E\\d+A\\d+S\\d+B\\d+$' },
                      beat_type: { type: 'string', enum: ['action', 'dialogue', 'parenthetical', 'transition', 'title_card', 'voice_over', 'off_screen', 'montage_start', 'montage_end', 'flashback_start', 'flashback_end', 'insert'] },
                    },
                    allOf: [
                      {
                        if: { properties: { beat_type: { enum: ['dialogue', 'voice_over', 'off_screen'] } }, required: ['beat_type'] },
                        then: { required: ['character_id', 'dialogue_text'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'action' } }, required: ['beat_type'] },
                        then: { required: ['action_text'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'parenthetical' } }, required: ['beat_type'] },
                        then: { required: ['character_id', 'parenthetical_text'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'transition' } }, required: ['beat_type'] },
                        then: { required: ['transition_type'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'title_card' } }, required: ['beat_type'] },
                        then: { required: ['title_card_text'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'insert' } }, required: ['beat_type'] },
                        then: { required: ['insert_description'] },
                      },
                      {
                        if: { properties: { beat_type: { const: 'flashback_start' } }, required: ['beat_type'] },
                        then: { required: ['flashback_label'] },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
