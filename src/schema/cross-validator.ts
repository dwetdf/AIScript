// ============================================================================
// 跨阶段数据一致性校验 — F65
// 验证三个 Schema 产物之间的数据一致性
// ============================================================================

import type { NovelAnalysis, AdaptationPlan, Screenplay, ValidationResult } from './types';

/**
 * 校验 AdaptationPlan 与 NovelAnalysis 之间的一致性
 */
export function validatePlanConsistency(
  analysis: NovelAnalysis,
  plan: AdaptationPlan
): ValidationResult {
  const errors: string[] = [];

  // 检查所有 scene_plan 引用的 character_id 是否在 analysis 中存在
  const knownIds = new Set(analysis.character_analysis.map((c) => c.character_id));

  for (const scene of plan.scene_plan) {
    if (scene.characters_present) {
      for (const cid of scene.characters_present) {
        if (!knownIds.has(cid)) {
          errors.push(
            `scene_plan[${scene.scene_global_number}].characters_present 中的 character_id "${cid}" 不在 NovelAnalysis 中`
          );
        }
      }
    }
  }

  // 检查 character_adaptations 中所有 character_id 是否存在
  if (plan.adaptation_strategy.character_adaptations) {
    for (const ca of plan.adaptation_strategy.character_adaptations) {
      if (!knownIds.has(ca.character_id)) {
        errors.push(
          `character_adaptations 中的 character_id "${ca.character_id}" 不在 NovelAnalysis 中`
        );
      }
    }
  }

  // 检查 characters_draft 中所有 character_id 是否存在
  if (plan.characters_draft) {
    const draftCharsSet = new Set(plan.characters_draft.map((c) => c.character_id));
    for (const char of analysis.character_analysis) {
      if (!draftCharsSet.has(char.character_id) && char.importance !== 'minor' && char.importance !== 'cameo') {
        errors.push(
          `NovelAnalysis 中的 important 角色 "${char.character_id}" (${char.name}) 未出现在 characters_draft 中`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验 Screenplay 与 AdaptationPlan 之间的一致性
 */
export function validateScreenplayConsistency(
  plan: AdaptationPlan,
  screenplay: Screenplay
): ValidationResult {
  const errors: string[] = [];

  // 检查 scene_plan 条目数是否与 screenplay.scenes 数一致
  const totalScenes = screenplay.acts.reduce((sum, act) => sum + act.scenes.length, 0);
  if (plan.scene_plan.length !== totalScenes) {
    errors.push(
      `scene_plan 有 ${plan.scene_plan.length} 个场景，但 screenplay 有 ${totalScenes} 个场景`
    );
  }

  // 检查所有 screenplay character_id 是否在 plan characters_draft 中存在
  const draftIds = new Set((plan.characters_draft || []).map((c) => c.character_id));
  for (const char of screenplay.characters) {
    if (!draftIds.has(char.character_id) && plan.characters_draft && plan.characters_draft.length > 0) {
      errors.push(
        `screenplay.characters 中的 "${char.character_id}" 不在 AdaptationPlan.characters_draft 中`
      );
    }
  }

  // 检查新 character_id 与传统 plan 的 consistency
  const analysisIds = new Set<string>();
  // Plan draft IDs
  for (const dc of plan.characters_draft || []) {
    analysisIds.add(dc.character_id);
  }
  // Screenplay character IDs
  const screenplayIds = new Set(screenplay.characters.map((c) => c.character_id));

  // 不需要报警——新增人物是允许的
  // 但如果有适配计划说要 merge/cut 的人物还在 screenplay，则报错
  if (plan.adaptation_strategy.character_adaptations) {
    for (const ca of plan.adaptation_strategy.character_adaptations) {
      if (ca.action === 'cut' && screenplayIds.has(ca.character_id)) {
        errors.push(
          `adaptation_plan 标记 cut 的 "${ca.character_id}" 仍出现在 screenplay 中`
        );
      }
      if (ca.action === 'merge' && screenplayIds.has(ca.character_id) && ca.merge_with) {
        errors.push(
          `adaptation_plan 标记 merge 的 "${ca.character_id}" 仍作为独立角色出现在 screenplay 中`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 全链路一致性校验 — 三个阶段的 AI 引擎配置必须一致
 */
export function validateAiConfigConsistency(
  analysis?: { ai_config?: { ai_provider?: string; ai_model?: string } },
  plan?: { ai_config?: { ai_provider?: string; ai_model?: string } },
  screenplayMeta?: { conversion_config?: { ai_provider?: string; ai_model?: string } }
): ValidationResult {
  const errors: string[] = [];

  const provider1 = analysis?.ai_config?.ai_provider;
  const provider2 = plan?.ai_config?.ai_provider;
  const provider3 = screenplayMeta?.conversion_config?.ai_provider;

  if (provider1 && provider2 && provider1 !== provider2) {
    errors.push(`阶段 1 ai_provider (${provider1}) ≠ 阶段 2 ai_provider (${provider2})`);
  }
  if (provider2 && provider3 && provider2 !== provider3) {
    errors.push(`阶段 2 ai_provider (${provider2}) ≠ 阶段 3 ai_provider (${provider3})`);
  }

  return { valid: errors.length === 0, errors };
}
