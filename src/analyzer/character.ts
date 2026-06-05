// ============================================================================
// 人物分析 — F14 人物识别与分配 ID / F15 特征提取 / F16 重要性评级 / F17 改编适用性
// ============================================================================

import type { CharacterAnalysis, CharacterRelation } from '../schema/types';
import { generateCharacterId } from '../shared/id-generator';

/**
 * 从 AI 原始输出中构建人物分析
 * 为每个人物分配唯一的 character_id
 */
export function buildCharacterAnalysis(raw: Array<Record<string, unknown>>): CharacterAnalysis[] {
  const usedIds = new Set<string>();

  return raw.map((rc) => {
    const name = (rc.name as string) || 'Unknown';
    const charId = makeUniqueId(generateCharacterId(name), usedIds);
    usedIds.add(charId);

    return {
      character_id: charId,
      name,
      aliases: rc.aliases as string[],
      role: (rc.role as CharacterAnalysis['role']) || 'supporting',
      importance: (rc.importance as CharacterAnalysis['importance']) || 'major',
      identity: rc.identity as string,
      motivation: rc.motivation as CharacterAnalysis['motivation'],
      character_arc: rc.character_arc as string,
      relationships: (rc.relationships as Array<{
        target_character_id: string;
        type: string;
        description: string;
        dynamics?: string;
      }> || []).map((r) => ({
        target_character_id: r.target_character_id,
        type: (r.type as CharacterRelation['type']) || 'other',
        description: r.description,
        dynamics: r.dynamics,
      })) as CharacterRelation[],
      distinctive_traits: rc.distinctive_traits as CharacterAnalysis['distinctive_traits'],
      adaptability_notes: rc.adaptability_notes as string,
    };
  });
}

function makeUniqueId(baseId: string, used: Set<string>): string {
  if (!used.has(baseId)) return baseId;
  let i = 2;
  while (used.has(`${baseId}_${i}`)) i++;
  return `${baseId}_${i}`;
}
