"use client";

import { useEffect, useState } from "react";
import { applyChanges, type Change } from "../../lib/admin/changes";
import { loadWorkbook, saveWorkbook } from "../../lib/admin/edit";
import { checkWorkbook, schema, type Issue, type WorkbookData } from "../../lib/workbook";

export interface Projection {
  /** What the workbook would hold if the pending changes were saved. */
  data: WorkbookData;
  /** Problems the validator finds in that workbook. */
  issues: Issue[];
  ready: boolean;
}

/** The workbook with the pending changes applied and validated, recomputed shortly after either changes. */
export function useProjection(bytes: Uint8Array, pending: Change[], base: { data: WorkbookData; issues: Issue[] }): Projection {
  const [state, setState] = useState<Projection>({ data: base.data, issues: base.issues, ready: true });

  useEffect(() => {
    if (pending.length === 0) return; // nothing to apply: the workbook as loaded is already checked
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const wb = await loadWorkbook(bytes);
        applyChanges(wb, schema, pending, new Set(pending.keys())); // clashes are dealt with when saving
        const projected = await saveWorkbook(wb);
        const { data, issues } = await checkWorkbook(projected as unknown as ArrayBuffer, projected.byteLength);
        if (current) setState({ data, issues, ready: true });
      } catch {
        if (current) setState((s) => ({ ...s, ready: true }));
      }
    }, 80);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [bytes, pending]);

  return pending.length === 0 ? { data: base.data, issues: base.issues, ready: true } : state;
}
