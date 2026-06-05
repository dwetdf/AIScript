// ============================================================================
// useBeatEdit — Beat 编辑逻辑 (F67 F68)
// ============================================================================

import { useCallback } from 'react';
import { useScriptStore } from '@/store';
import type { Beat } from '../../schema/types';

export function useBeatEdit() {
  const updateBeat = useScriptStore((s) => s.updateBeat);
  const insertBeat = useScriptStore((s) => s.insertBeat);
  const deleteBeat = useScriptStore((s) => s.deleteBeat);

  const editBeat = useCallback(
    (beatId: string, patch: Partial<Beat>) => {
      updateBeat(beatId, patch);
    },
    [updateBeat]
  );

  const addBeat = useCallback(
    (sceneGlobalNumber: number, index: number, beat: Beat) => {
      insertBeat(sceneGlobalNumber, index, beat);
    },
    [insertBeat]
  );

  const removeBeat = useCallback(
    (beatId: string) => {
      deleteBeat(beatId);
    },
    [deleteBeat]
  );

  return { editBeat, addBeat, removeBeat };
}
