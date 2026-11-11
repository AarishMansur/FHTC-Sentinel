import { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";

/** Shell for the working console: sidebar, top bar, admin actions, toasts. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
