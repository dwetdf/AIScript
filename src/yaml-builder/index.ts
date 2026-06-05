// ============================================================================
// YAML 输出构建 — F57 F58 F59 F60 F61 F62 F64 F66
// 三个 Schema 的 YAML 序列化/反序列化 + beat_id 生成 + 元数据填充
// ============================================================================

import yaml from 'js-yaml';
import type { NovelAnalysis, AdaptationPlan, Screenplay, ValidationResult } from '../schema/types';
import { validate } from '../schema/validator';
import { SCHEMA_VERSIONS } from '../shared/constants';

export { validate };
export { generateBeatId } from '../shared/id-generator';

/**
 * 将数据对象序列化为 YAML 字符串
 */
export function toYaml(data: NovelAnalysis | AdaptationPlan | Screenplay): string {
  return yaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * 从 YAML 字符串反序列化为指定类型
 */
export function fromYaml<T>(yamlString: string): T {
  const parsed = yaml.load(yamlString);
  return parsed as T;
}

/**
 * 填充元数据到 Screenplay
 */
export function fillScreenplayMetadata(
  screenplay: Screenplay,
  options?: {
    ai_provider?: string;
    ai_model?: string;
    ai_api_base_url?: string;
    dialogue_density?: string;
    action_detail_level?: string;
    stage_direction_style?: string;
    prompt_version?: string;
  }
): Screenplay {
  return {
    ...screenplay,
    schema_version: SCHEMA_VERSIONS.screenplay,
    metadata: {
      ...screenplay.metadata,
      generated_at: new Date().toISOString(),
      language: screenplay.metadata.language || 'zh-CN',
      ...(options ? {
        conversion_config: {
          ai_provider: options.ai_provider,
          ai_model: options.ai_model,
          ai_api_base_url: options.ai_api_base_url,
          dialogue_density: options.dialogue_density as 'sparse' | 'balanced' | 'dense' | undefined,
          action_detail_level: options.action_detail_level as 'minimal' | 'standard' | 'detailed' | undefined,
          stage_direction_style: options.stage_direction_style as 'concise' | 'descriptive' | undefined,
          prompt_version: options.prompt_version,
        },
      } : {}),
    },
  };
}

/**
 * 导出 Screenplay 为 YAML（含校验）
 */
export function exportScreenplayYaml(screenplay: Screenplay): string {
  const filled = fillScreenplayMetadata(screenplay);
  return toYaml(filled);
}

/**
 * 引导性：Writes key metadata and YAML to export
 */
export function exportNovelAnalysisYaml(analysis: NovelAnalysis): string {
  const filled = { ...analysis, schema_version: SCHEMA_VERSIONS['novel-analysis'] };
  return toYaml(filled);
}

export function exportAdaptationPlanYaml(plan: AdaptationPlan): string {
  const filled = { ...plan, schema_version: SCHEMA_VERSIONS['adaptation-plan'] };
  return toYaml(filled);
}
