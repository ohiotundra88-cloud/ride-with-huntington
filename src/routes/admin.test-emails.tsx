import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, SendHorizonal, Loader2 } from "lucide-react";
import { TEST_EMAIL_TEMPLATES, sendTestEmail, sendAllTestEmails } from "@/lib/test-emails.functions";

export const Route = createFileRoute("/admin/test-emails")({
  head: () => ({
    meta: [
      { title: "Test emails — Super User" },
      { name: "description", content: "Send yourself a sample of each Team Huntington email." },
    ],
  }),
  component: TestEmailsAdmin,
});

function TestEmailsAdmin() {
  const sendOne = useServerFn(sendTestEmail);
  const sendAll = useServerFn(sendAllTestEmails);
  const [pending, setPending] = useState<string | null>(null);

  const handleSend = async (template: string) => {
    setPending(template);
    try {
      const result = await sendOne({ data: { template } });
      if (result.sent) {
        toast.success(`Sent to ${result.to}`);
      } else {
        toast.error(`Not sent: your address is on the do-not-email list (${result.to}).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setPending(null);
    }
  };

  const handleSendAll = async () => {
    setPending("all");
    try {
      const results = await sendAll();
      const sent = results.filter((r) => r.sent).length;
      const to = results[0]?.to ?? "your inbox";
      if (sent === results.length) {
        toast.success(`All ${sent} test emails sent to ${to}`);
      } else {
        toast.warning(`${sent} of ${results.length} sent to ${to}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <AdminShell title="Test emails">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Send yourself a sample
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each button sends that email, filled with sample content, to your own email address.
            Subjects are prefixed with [TEST] so you can tell them apart from the real thing.
            Only Super Users can use this page, and emails only ever go to you.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEST_EMAIL_TEMPLATES.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{t.label}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending !== null}
                  onClick={() => handleSend(t.name)}
                >
                  {pending === t.name ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            ))}
          </div>
          <Button onClick={handleSendAll} disabled={pending !== null}>
            {pending === "all" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="mr-1 h-4 w-4" />
            )}
            Send all four
          </Button>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
