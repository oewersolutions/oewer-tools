"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The admin page carries its own strict Content Security Policy in a <meta> tag, and a policy cannot be removed
 * from a page once it is applied. If the visitor moves from the admin page to another page without a full page
 * load, reload so that the other page starts clean, and the admin policy (and token) never follow them.
 */
export default function LeaveAdmin() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    const wasAdmin = /\/admin\/?$/.test(previous.current);
    const isAdmin = /\/admin\/?$/.test(pathname);
    previous.current = pathname;
    if (wasAdmin && !isAdmin) window.location.reload();
  }, [pathname]);
  return null;
}
