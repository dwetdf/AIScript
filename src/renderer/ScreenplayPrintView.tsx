// ============================================================================
// ScreenplayPrintView — 干净剧本打印视图 (v0.3.0)
// 渲染标准好莱坞格式的剧本 HTML，屏幕隐藏，仅 @media print 时可见
// ============================================================================

import React from 'react';
import { useScriptStore } from '../store';
import type {
  Beat,
  DialogueBeat,
  ActionBeat,
  ParentheticalBeat,
  TransitionBeat,
  TitleCardBeat,
  InsertBeat,
  FlashbackStartBeat,
} from '../schema/types';

/** 获取对话类 beat 的展示名 */
function getCharName(b: DialogueBeat): string {
  return b.character_name_display || b.character_id || '角色';
}

export const ScreenplayPrintView: React.FC = () => {
  const screenplay = useScriptStore((s) => s.screenplay);
  if (!screenplay) return null;

  const { metadata, acts } = screenplay;

  return (
    <div id="screenplay-print-view" style={{ display: 'none' }}>
      {/* ======== 标题页 ======== */}
      <div className="title-page">
        <h1>{metadata.title}</h1>
        <p className="author">作者：{metadata.author || '未知'}</p>
        <p className="meta">
          目标媒介：{metadata.target_medium} &nbsp;|&nbsp;
          语言：{metadata.language} &nbsp;|&nbsp;
          生成于：{new Date(metadata.generated_at).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* ======== 人物表 ======== */}
      {screenplay.characters.length > 0 && (
        <div className="character-list page-break-before">
          <h2>人物表</h2>
          {screenplay.characters.map((c) => (
            <p key={c.character_id} className="character-entry">
              <strong>{c.name}</strong>
              {c.aliases?.length ? `（${c.aliases.join('、')}）` : ''}
              &nbsp;—&nbsp;{c.role_type === 'protagonist' ? '主角' :
                c.role_type === 'antagonist' ? '反派' :
                c.role_type === 'supporting' ? '配角' : c.role_type}
              {c.description ? `：${c.description}` : ''}
            </p>
          ))}
        </div>
      )}

      {/* ======== 正文 ======== */}
      <div className="page-break-before">
        {acts.map((act) => (
          <React.Fragment key={`act-${act.act_number}`}>
            {act.scenes.map((scene) => (
              <React.Fragment key={`scene-${scene.scene_global_number}`}>
                {/* 场景头 */}
                <div className="scene-heading">
                  <span className="scene-number">{scene.scene_number}.</span>
                  {scene.scene_heading}
                </div>

                {/* Beats */}
                {scene.beats.map((beat) => (
                  <RenderBeat key={beat.beat_id} beat={beat} />
                ))}

                {/* 场景间空行 */}
                <div style={{ height: 12 }} />
              </React.Fragment>
            ))}

            {/* 幕间标记 */}
            {act.act_number < acts.length && (
              <div style={{ textAlign: 'center', margin: '24pt 0' }} className="beat-transition">
                — 第{act.act_number}幕 结束 —
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 尾页 */}
      <div className="end-page page-break-before" style={{ textAlign: 'center', marginTop: '30%' }}>
        <p>— 剧本结束 —</p>
        <p style={{ fontSize: 11, color: '#999' }}>
          本剧本由 AI 辅助生成 · 初稿
        </p>
      </div>
    </div>
  );
};

/** 根据 beat 类型渲染正确的 HTML 标签和 class */
const RenderBeat: React.FC<{ beat: Beat }> = ({ beat }) => {
  switch (beat.beat_type) {
    case 'action':
      return <p className="beat-action">{beat.action_text}</p>;

    case 'montage_start':
      return <p className="beat-action">【蒙太奇 开始】</p>;

    case 'montage_end':
      return <p className="beat-action">【蒙太奇 结束】</p>;

    case 'flashback_end':
      return <p className="beat-action">【闪回 结束】</p>;

    case 'dialogue':
    case 'voice_over':
    case 'off_screen': {
      const prefix = beat.beat_type === 'voice_over' ? '(V.O.) '
        : beat.beat_type === 'off_screen' ? '(O.S.) '
        : '';
      const dBeat = beat as DialogueBeat;
      return (
        <>
          <p className="beat-character">{prefix}{getCharName(dBeat).toUpperCase()}</p>
          <p className="beat-dialogue">{dBeat.dialogue_text}</p>
        </>
      );
    }

    case 'parenthetical':
      return (
        <p className="beat-parenthetical">
          ({(beat as ParentheticalBeat).parenthetical_text})
        </p>
      );

    case 'transition':
      return (
        <p className="beat-transition">
          {(beat as TransitionBeat).transition_type}
        </p>
      );

    case 'title_card':
      return (
        <p className="beat-action" style={{ textAlign: 'center', fontWeight: 'bold' }}>
          {(beat as TitleCardBeat).title_card_text}
        </p>
      );

    case 'flashback_start':
      return (
        <p className="beat-action">
          【闪回：{(beat as FlashbackStartBeat).flashback_label}】
        </p>
      );

    case 'insert':
      return (
        <p className="beat-action" style={{ fontStyle: 'italic' }}>
          【插入镜头：{(beat as InsertBeat).insert_description}】
        </p>
      );

    default:
      return null;
  }
};
