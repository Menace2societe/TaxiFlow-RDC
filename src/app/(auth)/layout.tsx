import type { Viewport } from "next";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const viewport: Viewport = {
  themeColor: "#f7f7f2"
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
