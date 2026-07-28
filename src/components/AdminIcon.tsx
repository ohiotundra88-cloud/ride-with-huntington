import {
  AlertTriangle,
  Baby,
  Bike,
  Car,
  CheckCircle2,
  CloudSun,
  DollarSign,
  Hotel,
  MapPin,
  Radio,
  Shirt,
  Tent,
  Users,
  Utensils,
  Accessibility,
  Megaphone,
  Bell,
  Calendar,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  check: CheckCircle2,
  hotel: Hotel,
  bike: Bike,
  users: Users,
  dollar: DollarSign,
  shirt: Shirt,
  car: Car,
  map: MapPin,
  tent: Tent,
  radio: Radio,
  baby: Baby,
  utensils: Utensils,
  accessibility: Accessibility,
  cloud: CloudSun,
  alert: AlertTriangle,
  megaphone: Megaphone,
  bell: Bell,
  calendar: Calendar,
  chat: MessageSquare,
};

export const iconOptions = Object.keys(map);

export function AdminIcon({ name, className }: { name: string; className?: string }) {
  const Ico = map[name] ?? Megaphone;
  return <Ico className={className} />;
}
