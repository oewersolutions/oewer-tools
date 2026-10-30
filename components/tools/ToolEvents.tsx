"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { trackToolEvent } from "../../lib/analytics";

interface ToolEventsValue {
  interacted: React.RefObject<boolean>;
  completed: React.RefObject<boolean>;
  tool: string;
}

const Context = createContext<ToolEventsValue | null>(null);

/**
 * Wraps a tool page's component. `tool_open` is sent once when the tool is shown. `tool_complete` is sent once per
 * visit, the first time the tool shows a result after the visitor has actually used it (typed, picked or clicked),
 * so a calculator's starting example does not count. Only the tool's address is sent.
 */
export function ToolEvents({ tool, children }: { tool: string; children: ReactNode }) {
  const interacted = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    trackToolEvent("tool_open", tool);
  }, [tool]);

  const mark = () => {
    interacted.current = true;
  };
  return (
    <Context.Provider value={{ interacted, completed, tool }}>
      <div onInputCapture={mark} onChangeCapture={mark} onClickCapture={mark} onDropCapture={mark}>
        {children}
      </div>
    </Context.Provider>
  );
}

/** A tool calls this on every render with whether it is currently showing a result. */
export function useReportResult(hasResult: boolean): void {
  const ctx = useContext(Context);
  useEffect(() => {
    if (!ctx || !hasResult || !ctx.interacted.current || ctx.completed.current) return;
    ctx.completed.current = true;
    trackToolEvent("tool_complete", ctx.tool);
  });
}
