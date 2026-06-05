// ============================================================================
// useUndoRedo — 撤销/重做 (F76)
// ============================================================================

import { useCallback, useRef } from 'react';
import { useScriptStore } from '@/store';
import type { Screenplay } from '../../schema/types';

const MAX_HISTORY = 50;

interface UndoRedoState {
  past: Screenplay[];
  present: Screenplay | null;
  future: Screenplay[];
}

export function useUndoRedo() {
  const stateRef = useRef<UndoRedoState>({ past: [], present: null, future: [] });
  const screenplay = useScriptStore((s) => s.screenplay);
  const setScreenplay = useScriptStore((s) => s.setScreenplay);

  /** 记录当前状态（在修改前调用） */
  const recordState = useCallback(() => {
    if (!screenplay) return;
    const current = stateRef.current;

    // 如果 past 顶部的状态和现在一样，不重复记录
    if (current.past.length > 0) {
      const lastPast = current.past[current.past.length - 1];
      if (lastPast === screenplay) return;
    }

    current.past.push(structuredClone(screenplay));
    if (current.past.length > MAX_HISTORY) {
      current.past.shift();
    }
    current.future = [];
    current.present = null;
  }, [screenplay]);

  /** 撤销 */
  const undo = useCallback(() => {
    if (!screenplay) return;
    const current = stateRef.current;

    if (current.past.length === 0) return;

    // 保存当前状态到 future
    current.future.push(structuredClone(screenplay));

    // 从 past 取出上一个状态
    const prev = current.past.pop()!;
    setScreenplay(prev);
  }, [screenplay, setScreenplay]);

  /** 重做 */
  const redo = useCallback(() => {
    if (!screenplay) return;
    const current = stateRef.current;

    if (current.future.length === 0) return;

    // 保存当前状态到 past
    current.past.push(structuredClone(screenplay));

    // 从 future 取出下一个状态
    const next = current.future.pop()!;
    setScreenplay(next);
  }, [screenplay, setScreenplay]);

  return { recordState, undo, redo };
}
