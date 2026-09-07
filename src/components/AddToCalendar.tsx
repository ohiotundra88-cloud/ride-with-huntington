import { CalendarPlus, Apple, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadIcs, outlookWebUrl } from "@/lib/calendar-links";
import type { MyTeamEvent } from "@/lib/team-events.shared";

/** Menu letting an invitee add a team event to Apple Calendar or Outlook. */
export function AddToCalendar({ event, size = "sm" }: { event: MyTeamEvent; size?: "sm" | "default" }) {
  if (event.status === "cancelled") return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant="outline">
          <CalendarPlus className="mr-1 h-3.5 w-3.5" /> Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Add to your calendar</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => downloadIcs(event)}>
          <Apple className="mr-2 h-4 w-4" /> Apple Calendar
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={outlookWebUrl(event)} target="_blank" rel="noopener noreferrer">
            <Mail className="mr-2 h-4 w-4" /> Outlook (web)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadIcs(event)}>
          <CalendarPlus className="mr-2 h-4 w-4" /> Outlook (desktop file)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
