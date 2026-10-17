import { Megaphone } from "lucide-react";
import { adminIcons } from "@/components/admin-icons";

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  const Ico = adminIcons[name] ?? Megaphone;
  return <Ico className={className} />;
}
