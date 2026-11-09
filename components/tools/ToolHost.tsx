"use client";

import type { ToolComponentKey } from "../../lib/tools/keys";
import { toolComponents } from "./registry";

/** Shows one tool. Only that tool's code is downloaded, not the code of every tool on the site. */
export default function ToolHost({
  componentKey,
}: {
  componentKey: ToolComponentKey;
}) {
  const Tool = toolComponents[componentKey];
  return <Tool />;
}
