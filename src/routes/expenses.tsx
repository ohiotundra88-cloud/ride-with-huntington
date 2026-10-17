import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Printer, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Guide — Team Huntington Hub" },
      {
        name: "description",
        content: "Step-by-step guide to submitting Pelotonia expenses through Concur.",
      },
    ],
  }),
  component: Expenses,
});

const sections = [
  {
    title: "Before You Start",
    body: "Gather receipts (PDF or photo). Confirm your cost center with your manager or Team Huntington lead. Note your Pelotonia registration ID.",
  },
  {
    title: "Open Concur Expense",
    body: "Log into Concur and start a new expense report using the policy your manager or Team Huntington lead tells you to use.",
  },
  {
    title: "Create Report",
    body: "Give the report a clear name, such as 'Pelotonia Ride Weekend' and your last name. Set the date range to your travel window.",
  },
  {
    title: "Select Expense Type",
    body: "Use Airfare / Rail, Hotel, Meals, Transportation, or Other Business as applicable. Do NOT categorize personal fundraising.",
  },
  {
    title: "Enter Cost Center",
    body: "Enter the cost center you confirmed before you started.",
  },
  {
    title: "Attach Receipts",
    body: "Attach itemized receipts as Huntington's expense policy requires. Combine multi-page receipts into a single PDF where possible.",
  },
  {
    title: "Add Business Purpose",
    body: "'Team Huntington Pelotonia participation — brand and community engagement.'",
  },
  {
    title: "Submit for Approval",
    body: "Submit the report to your direct manager for approval.",
  },
  {
    title: "Track Status",
    body: "Track the report's status in Concur until it's approved.",
  },
];

function Expenses() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/75">
        Expense Guide
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-black text-[var(--brand-dark)]">
        How to submit Pelotonia expenses
      </h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        A colleague-friendly walkthrough for Concur Expense. Follow in order to avoid rejections.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Printable checklist
        </Button>
      </div>

      <div className="mt-8 grid gap-3">
        {sections.map((s, i) => (
          <Card key={s.title}>
            <CardContent className="p-5 flex gap-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] font-black text-sm">
                {i + 1}
              </div>
              <div>
                <h3 className="font-bold text-[var(--brand-dark)]">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <h4 className="mt-2 font-bold text-amber-900">Common mistakes</h4>
            <ul className="mt-2 text-xs text-amber-900 list-disc pl-4 space-y-1">
              <li>Wrong cost center</li>
              <li>Missing itemized receipts</li>
              <li>Categorizing personal donations</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-[var(--brand)]/40 bg-[var(--brand)]/10">
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-[var(--brand-dark)]" />
            <h4 className="mt-2 font-bold text-[var(--brand-dark)]">Receipt rules</h4>
            <ul className="mt-2 text-xs list-disc pl-4 space-y-1">
              <li>Required as set by Huntington expense policy</li>
              <li>Itemized (not just totals)</li>
              <li>PDF or clear photo</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CheckCircle2 className="h-5 w-5 text-[var(--brand-dark)]" />
            <h4 className="mt-2 font-bold text-[var(--brand-dark)]">Deadlines</h4>
            <ul className="mt-2 text-xs list-disc pl-4 space-y-1">
              <li>Submit promptly after you return</li>
              <li>Check Huntington expense policy for submission deadlines</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Expense FAQ</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="1">
              <AccordionTrigger>Mileage reimbursement</AccordionTrigger>
              <AccordionContent>
                Personal-vehicle mileage is reimbursed at the current IRS business rate. Log
                start/end addresses in Concur.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Hotel</AccordionTrigger>
              <AccordionContent>
                Reimbursable per Team Huntington policy for approved event nights. Include a
                folio-style itemized receipt.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Airfare</AccordionTrigger>
              <AccordionContent>
                Must be booked via Concur / ATG. Direct-booked flights are generally not
                reimbursable.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Meals</AccordionTrigger>
              <AccordionContent>
                Per-diem or actual (whichever your segment uses). Alcohol is not reimbursable.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="5">
              <AccordionTrigger>Missing receipts</AccordionTrigger>
              <AccordionContent>
                Attach a Missing Receipt Affidavit in Concur with vendor, date, amount, and business
                purpose.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
