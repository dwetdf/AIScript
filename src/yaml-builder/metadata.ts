// ============================================================================
// 元数据填充 — F60 Schema 版本标注 / F66 跨阶段 AI 引擎统一
// ============================================================================

import type { AiConfig } from '../schema/types';
import { SCHEMA_VERSIONS } from '../shared/constants';
import type { Screenplay, NovelAnalysis, AdaptationPlan } from '../schema/types';

/**
 * 为 NovelAnalysis 填充元数据
 */
export function fillAnalysisMetadata(
  analysis: Partial<NovelAnalysis>,
  aiConfig: AiConfig
): NovelAnalysis {
  return {
    ...(analysis as NovelAnalysis),
    schema_version: SCHEMA_VERSIONS['novel-analysis'],
    generated_at: new Date().toISOString(),
    ai_config: aiConfig,
  };
}

/**
 * 为 AdaptationPlan 填充元数据
 */
export function fillPlanMetadata(
  plan: Partial<AdaptationPlan>,
  aiConfig: AiConfig
): AdaptationPlan {
  return {
    ...(plan as AdaptationPlan),
    schema_version: SCHEMA_VERSIONS['adaptation-plan'],
    generated_at: new Date().toISOString(),
    ai_config: aiConfig,
  };
}

/**
 * 为 Screenplay 填充元数据
 * F66: 三阶段 AI 引擎统一 — 传入同一个 ai_config 对象
 */
export function fillScreenplayMetadata(
  screenplay: Partial<Screenplay>,
  aiConfig: AiConfig
): Screenplay {
  const sp = screenplay as Screenplay;
  return {
    ...sp,
    schema_version: SCHEMA_VERSIONS.screenplay,
    metadata: {
      ...sp.metadata,
      generated_at: new Date().toISOString(),
      conversion_config: {
        ...sp.metadata.conversion_config,
        ai_provider: aiConfig.ai_provider,
        ai_model: aiConfig.ai_model,
        ai_api_base_url: aiConfig.ai_api_base_url,
      },
    },
  };
}
