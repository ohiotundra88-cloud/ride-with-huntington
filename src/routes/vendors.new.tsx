import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { VendorGate } from "@/components/VendorGate";
import { VendorForm } from "@/components/VendorForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vendors/new")({
  component: () => (
    <VendorGate>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/vendors"><ArrowLeft className="mr-1 h-4 w-4" /> Vendor CRM</Link>
        </Button>
        <h1 className="text-2xl font-bold text-[var(--brand-dark)]">New vendor</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          Business name and a primary point of contact are required.
        </p>
        <VendorForm />
      </main>
    </VendorGate>
  ),

  head: () => ({
    meta: [
      { title: "New vendor — Vendor CRM" },
      { name: "description", content: "Create a new Team Huntington vendor record with spend, commitments, and contacts." },
      { property: "og:title", content: "New vendor — Vendor CRM" },
      { property: "og:description", content: "Add a vendor relationship to the Team Huntington vendor CRM." },
    ],
  }),
});
