// ============================================================================
// 端到端全流程验证（不含AI）— 纯数据管线测试
// 验证 Parser → Analyzer → Planner → Converter 的数据结构完整性
// 用法: npx tsx src/test-e2e.ts
// ============================================================================

import { readFileSync } from 'node:fs';
import { cleanNovel } from './parser/cleaner.js';
import { detectChapterBoundaries } from './parser/chapter-detector.js';
import { validate } from './schema/validator.js';
import { validatePlanConsistency } from './schema/cross-validator.js';
import { toYaml, fromYaml } from './yaml-builder/index.js';
import { generateCharacterId, generateBeatId } from './shared/id-generator.js';
import { createInitialRevision, appendRevision } from './shared/revision-history.js';
import { SCHEMA_VERSIONS } from './shared/constants.js';
import type { NovelAnalysis, AdaptationPlan, Screenplay, Beat } from './schema/types.js';

const TEST_FILE = 'test/棋王.txt';

console.log('='.repeat(60));
console.log('AI 辅助剧本创作工具 — 端到端全流程验证');
console.log('='.repeat(60));

// =========================================================================
// Step 1: Parser
// =========================================================================
console.log('\n📖 Step 1: 小说导入与解析');

const raw = readFileSync(TEST_FILE, 'utf-8');
const cleaned = cleanNovel(raw);
const chapters = detectChapterBoundaries(cleaned);

console.log(`   原始: ${raw.length.toLocaleString()} 字 → 清洗后: ${cleaned.length.toLocaleString()} 字`);
console.log(`   章节数: ${chapters.length}`);
for (const ch of chapters) {
  console.log(`     Ch${ch.chapterNumber}: ${ch.title ?? '(无标题)'} — ${ch.paragraphs.length} 段`);
}
if (chapters.length < 3) { console.error('❌ 章节数 < 3'); process.exit(1); }
console.log('   ✅ Parser 通过');

// =========================================================================
// Step 2: 构建 NovelAnalysis（模拟 AI 输出）
// =========================================================================
console.log('\n🔍 Step 2: NovelAnalysis 构建 + 校验');

const analysis: NovelAnalysis = {
  schema_version: SCHEMA_VERSIONS['novel-analysis'],
  source_info: {
    title: '棋王', author: '阿城', total_chapters: chapters.length,
    analyzed_chapters: { start_chapter: 1, end_chapter: chapters.length },
    language: 'zh-CN', word_count: cleaned.length,
  },
  theme_analysis: {
    core_themes: [
      { theme: '物质生存与精神追求的辩证法', description: '王一生在极端匮乏中通过下棋找到超越温饱的精神力量' },
    ],
    tonal_characteristics: ['沉静', '内敛', '苦涩中带温暖'],
  },
  plot_analysis: {
    main_plot: { description: '棋呆子王一生在贫瘠时代中执着下棋，最终在一人对九人的盲棋大战中完成超越', stakes: '一个人的精神纯粹性在极端贫困中能否存活' },
    core_conflict: { type: 'person_vs_society', description: '个人纯粹 vs 社会规则的冲突' },
    key_events: [
      { event: '火车上初遇王一生', chapter: 1, description: '"我"在知青专列上遇见棋呆子', dramatic_function: 'inciting_incident' },
      { event: '九人盲棋大战', chapter: 4, description: '王一生同时与九人下盲棋，千人围观', dramatic_function: 'climax' },
    ],
  },
  character_analysis: [
    { character_id: 'wang_yi_sheng', name: '王一生', role: 'protagonist', importance: 'essential', identity: '知青，棋呆子' },
    { character_id: 'wo', name: '我', role: 'supporting', importance: 'major', identity: '知青，叙述者' },
    { character_id: 'ni_bin', name: '倪斌', role: 'supporting', importance: 'major', identity: '知青，家传棋道' },
  ],
  chapter_summaries: chapters.map((ch) => ({
    chapter_number: ch.chapterNumber, chapter_title: ch.title,
    summary: `${ch.title ?? ''}，${ch.paragraphs.length} 段`,
    paragraph_count: ch.paragraphs.length,
    adaptation_potential: 'high' as const,
    raw_passages: ch.paragraphs.map((p) => ({ paragraph: p.index, text: p.text, significance: 'major' as const })),
  })),
  generated_at: new Date().toISOString(),
};

const v1 = validate(analysis, 'novel-analysis');
if (!v1.valid) { console.error(`❌ NovelAnalysis 校验失败: ${v1.errors.join('; ')}`); process.exit(1); }
console.log('   ✅ NovelAnalysis Schema 校验通过');

// =========================================================================
// Step 3: 构建 AdaptationPlan
// =========================================================================
console.log('\n🏗️ Step 3: AdaptationPlan 构建 + 校验');

const plan: AdaptationPlan = {
  schema_version: SCHEMA_VERSIONS['adaptation-plan'],
  adaptation_strategy: {
    target_medium: 'film',
    tone_adaptation: { source_tone: '沉静', target_tone: 'serious', notes: '保持原味' },
    structural_decisions: [
      { decision: '四章→三幕', rationale: '经典电影结构', impact: 'high', affected_chapters: [1, 2, 3, 4] },
    ],
    character_adaptations: [
      { character_id: 'wang_yi_sheng', action: 'keep', notes: '保留全部戏份' },
      { character_id: 'wo', action: 'keep', notes: '叙述者，保留' },
      { character_id: 'ni_bin', action: 'keep', notes: '对比人物，保留' },
    ],
    pacing_strategy: { overall_pacing: 'varied', high_tension_ratio: 0.3, breathing_room: '高潮前充分铺垫' },
    externalization_strategy: '内心通过吃相和微表情传达',
  },
  episode_plan: {
    total_acts: 3,
    acts: [
      { act_number: 1, act_title: '第一幕 相逢', act_type: 'setup', synopsis: '火车相遇', estimated_scene_count: 6, estimated_duration_minutes: 25, source_chapters: [1] },
      { act_number: 2, act_title: '第二幕 棋逢对手', act_type: 'confrontation', synopsis: '农场对弈', estimated_scene_count: 5, estimated_duration_minutes: 30, source_chapters: [2, 3] },
      { act_number: 3, act_title: '第三幕 九连环', act_type: 'resolution', synopsis: '车轮大战', estimated_scene_count: 8, estimated_duration_minutes: 35, source_chapters: [4] },
    ],
  },
  scene_plan: [
    {
      scene_global_number: 1, act_number: 1, scene_number: 1,
      location: { name: '火车车厢', interior_exterior: 'INT', set_description: '1970年代知青专列' },
      time_of_day: '日',
      synopsis: '«我»在火车上遇见精瘦的王一生。王一生问"下棋吗"。',
      dramatic_function: 'exposition',
      tension_level: 2,
      characters_present: ['wang_yi_sheng', 'wo'],
      source_chapter_ref: '第一章',
      source_context: {
        summary: '车厢里，精瘦的王一生发现«我»的手指细长，问"下棋吗"。掏棋子横摆棋盘。同学认出棋呆子。',
        key_dialogues: [
          { speaker: '王一生', text: '下棋吗？', context_note: '开场白，眼中放光' },
        ],
        key_actions: [
          { description: '王一生取出棋子，横摆棋盘——因为棋盘太大放不下' },
        ],
      },
      beat_plan: {
        estimated_beat_count: 18,
        key_beats: [
          { order: 1, beat_type: 'action', description: '车站人群', from_source: true },
          { order: 4, beat_type: 'dialogue', description: '王一生问"下棋吗？"', character_id: 'wang_yi_sheng', from_source: true },
        ],
        notes: '开场要慢，建立人物',
      },
    },
    {
      scene_global_number: 10, act_number: 3, scene_number: 4,
      location: { name: '地区棋场', interior_exterior: 'INT_EXT', set_description: '空荡大屋+外面空地' },
      time_of_day: '日（至天黑）',
      synopsis: '王一生一人对九人盲棋大战。冠军老者求和。赛后王一生看到母亲无字棋嚎啕。',
      dramatic_function: 'climax',
      tension_level: 5,
      characters_present: ['wang_yi_sheng', 'wo', 'ni_bin'],
      source_chapter_ref: '第四章',
      source_context: {
        summary: '九人车轮盲棋大战。上千人围观。数小时后仅剩冠军一盘。老者从人群走出，赞誉王一生棋道。王一生力竭站不起来。赛后看到无字棋喊母亲。',
        key_dialogues: [
          { speaker: '冠军老者', text: '汇道禅于一炉，神机妙算……愿平手言和？' },
          { speaker: '王一生', text: '和了吧。' },
          { speaker: '王一生', text: '妈——儿今天——妈——' },
        ],
        key_actions: [
          { description: '王一生孤坐中央，铁铸一个细树桩' },
          { description: '«我»递水，他报完棋步才喝，眼中有泪花' },
        ],
      },
      beat_plan: {
        estimated_beat_count: 40,
        key_beats: [
          { order: 1, beat_type: 'action', description: '人群涌向棋场', from_source: true },
          { order: 28, beat_type: 'dialogue', description: '冠军老者赞誉', from_source: true },
          { order: 38, beat_type: 'dialogue', description: '王一生喊"妈"', character_id: 'wang_yi_sheng', from_source: true },
        ],
        notes: '全片高潮',
      },
    },
  ],
  characters_draft: [
    { character_id: 'wang_yi_sheng', name: '王一生', role_type: 'protagonist', description: '棋呆子' },
    { character_id: 'wo', name: '我', role_type: 'supporting', description: '叙述者' },
    { character_id: 'ni_bin', name: '倪斌', role_type: 'supporting', description: '脚卵' },
  ],
  generated_at: new Date().toISOString(),
};

const v2 = validate(plan, 'adaptation-plan');
if (!v2.valid) { console.error(`❌ AdaptationPlan 校验失败: ${v2.errors.join('; ')}`); process.exit(1); }
const cResult = validatePlanConsistency(analysis, plan);
if (!cResult.valid) { console.warn(`   ⚠️ 一致性警告: ${cResult.errors.join('; ')}`); }
console.log('   ✅ AdaptationPlan Schema 校验通过');

// =========================================================================
// Step 4: 构建 Screenplay（模拟 Converter 输出）
// =========================================================================
console.log('\n🎬 Step 4: Screenplay 构建 + 校验');

const screenplay: Screenplay = {
  schema_version: SCHEMA_VERSIONS.screenplay,
  revision_history: [createInitialRevision('AI', '基于棋王第1-4章生成')],
  metadata: {
    title: '棋王', original_title: '棋王', author: '阿城',
    source_type: 'novel', target_medium: 'film', language: 'zh-CN',
    generated_at: new Date().toISOString(),
    source_chapters: { start_chapter: 1, end_chapter: 4, chapter_titles: chapters.map((c) => c.title ?? '') },
    estimated_runtime_minutes: 90,
    genre: ['drama'], tone: 'serious',
  },
  characters: [
    {
      character_id: 'wang_yi_sheng', name: '王一生', role_type: 'protagonist',
      description: '精瘦的知青，痴迷下象棋。母亲用牙刷把磨了一副无字棋。',
      arc: '从痴迷求胜→悟道不争→在车轮大战中完成超越',
      first_appearance: { act_number: 1, scene_global_number: 1 },
    },
    {
      character_id: 'wo', name: '我', role_type: 'supporting',
      description: '知识青年，叙述者。王一生精神历程的见证人。',
      first_appearance: { act_number: 1, scene_global_number: 1 },
    },
    {
      character_id: 'ni_bin', name: '倪斌', aliases: ['脚卵'], role_type: 'supporting',
      description: '高个子知青，家传棋道，好面子。',
      first_appearance: { act_number: 2, scene_global_number: 4 },
    },
  ],
  acts: [
    {
      act_number: 1, act_title: '第一幕 相逢', act_type: 'setup',
      synopsis: '火车相遇',
      scenes: [
        {
          scene_number: 1, scene_global_number: 1,
          location: { name: '火车车厢', interior_exterior: 'INT' }, time_of_day: '日',
          scene_heading: 'INT. 火车车厢 — 日', scene_heading_override: false,
          dramatic_function: 'exposition', tension_level: 2,
          characters_present: ['wang_yi_sheng', 'wo'],
          beats: [
            { beat_id: 'E1A1S1B1', beat_type: 'action', action_text: '车站嘈杂。精瘦的学生独自坐角落。', is_ai_generated: false, estimated_duration_seconds: 10, source_ref: { chapter: 1, paragraph: 3 } } as Beat,
            { beat_id: 'E1A1S1B2', beat_type: 'dialogue', character_id: 'wang_yi_sheng', dialogue_text: '下棋吗？', is_ai_generated: false, estimated_duration_seconds: 3, source_ref: { chapter: 1, paragraph: 4 } } as Beat,
          ],
        },
      ],
    },
    {
      act_number: 3, act_title: '第三幕 九连环', act_type: 'resolution',
      synopsis: '一人对九人盲棋',
      scenes: [
        {
          scene_number: 4, scene_global_number: 10,
          location: { name: '地区棋场', interior_exterior: 'INT_EXT' }, time_of_day: '日',
          scene_heading: 'INT/EXT. 地区棋场 — 日', scene_heading_override: false,
          dramatic_function: 'climax', tension_level: 5,
          characters_present: ['wang_yi_sheng', 'wo', 'ni_bin'],
          beats: [
            { beat_id: 'E1A3S10B1', beat_type: 'action', action_text: '千人在街上涌动，拥向棋场。', is_ai_generated: false, estimated_duration_seconds: 18, source_ref: { chapter: 4, paragraph: 3 } } as Beat,
            { beat_id: 'E1A3S10B32', beat_type: 'dialogue', character_id: 'wang_yi_sheng', dialogue_text: '和了吧。', estimated_duration_seconds: 3, source_ref: { chapter: 4, paragraph: 29 } } as Beat,
            { beat_id: 'E1A3S10B38', beat_type: 'dialogue', character_id: 'wang_yi_sheng', dialogue_text: '妈——儿今天——妈——', estimated_duration_seconds: 6, source_ref: { chapter: 4, paragraph: 31 } } as Beat,
          ],
        },
      ],
    },
  ],
};

const v3 = validate(screenplay, 'screenplay');
if (!v3.valid) { console.error(`❌ Screenplay 校验失败: ${v3.errors.join('; ')}`); process.exit(1); }
console.log('   ✅ Screenplay Schema 校验通过');

// =========================================================================
// Step 5: YAML 导出 + round-trip
// =========================================================================
console.log('\n💾 Step 5: YAML 导出');

const yamlAnalysis = toYaml(analysis);
const yamlPlan = toYaml(plan);
const yamlScreenplay = toYaml(screenplay);
console.log(`   analysis.yaml:   ${yamlAnalysis.length.toLocaleString()} 字符`);
console.log(`   plan.yaml:       ${yamlPlan.length.toLocaleString()} 字符`);
console.log(`   screenplay.yaml: ${yamlScreenplay.length.toLocaleString()} 字符`);

const reAnalysis = fromYaml<NovelAnalysis>(yamlAnalysis);
const rePlan = fromYaml<AdaptationPlan>(yamlPlan);
const reScreenplay = fromYaml<Screenplay>(yamlScreenplay);
if (reAnalysis.source_info.title !== '棋王') { console.error('❌ analysis round-trip 失败'); process.exit(1); }
if (rePlan.episode_plan.total_acts !== 3) { console.error('❌ plan round-trip 失败'); process.exit(1); }
if (reScreenplay.acts.length !== 2) { console.error('❌ screenplay round-trip 失败'); process.exit(1); }
console.log('   ✅ Round-trip 全部通过');

// =========================================================================
// Step 6: 数据量统计
// =========================================================================
console.log('\n' + '='.repeat(60));
console.log('📊 全流程数据统计');
console.log('='.repeat(60));
console.log(`   输入: ${TEST_FILE}`);
console.log(`   章节: ${chapters.length} 章, ${chapters.reduce((s, c) => s + c.paragraphs.length, 0)} 段`);
console.log(`   人物: ${analysis.character_analysis.length} 个 (${analysis.character_analysis.map((c) => c.character_id).join(', ')})`);
console.log(`   幕数: ${plan.episode_plan.total_acts} 幕, ${plan.scene_plan.length} 个场景`);
console.log(`   场景: ${screenplay.acts.reduce((s, a) => s + a.scenes.length, 0)} 个有beats的场景`);
console.log(`   Beat总数: ${screenplay.acts.reduce((s, a) => s + a.scenes.reduce((ss, sc) => ss + sc.beats.length, 0), 0)}`);
console.log('');
console.log('   各阶段产物存储位置 (localStorage):');
console.log('   - analysis:  aiscript_project_analysis_default_project');
console.log('   - plan:      aiscript_project_plan_default_project');
console.log('   - screenplay: aiscript_project_screenplay_default_project');
console.log('='.repeat(60));
console.log('\n🎉 全流程验证通过！纯数据管线无异常。');
console.log('   下一步：打开 http://localhost:5173 → 输入 DeepSeek API Key → 拖入棋王.txt → 跑AI全流程\n');
