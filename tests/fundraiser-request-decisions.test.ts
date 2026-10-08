import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStageDecision,
  type FundraiserRequest,
} from "../src/lib/fundraiser-requests.shared.ts";

const request = (): FundraiserRequest =>
  ({
    status: "in_review",
    captain_status: "approved",
    legal_status: "pending",
    risk_status: "pending",
    compliance_status: "pending",
    marketing_status: "pending",
    cochair_status: "pending",
  }) as FundraiserRequest;

test("a concurrent approval cannot overwrite a decline", () => {
  const approvalThenDecline = applyStageDecision(
    applyStageDecision(request(), "legal", "approved"),
    "risk",
    "declined",
  );
  const declineThenApproval = applyStageDecision(
    applyStageDecision(request(), "risk", "declined"),
    "legal",
    "approved",
  );

  for (const result of [approvalThenDecline, declineThenApproval]) {
    assert.equal(result.legal_status, "approved");
    assert.equal(result.risk_status, "declined");
    assert.equal(result.status, "declined");
  }
});

test("a concurrent approval cannot overwrite a request for changes", () => {
  const result = applyStageDecision(
    applyStageDecision(request(), "compliance", "changes_requested"),
    "marketing",
    "approved",
  );

  assert.equal(result.compliance_status, "changes_requested");
  assert.equal(result.marketing_status, "approved");
  assert.equal(result.status, "changes_requested");
});

test("the co-chair decision completes an otherwise cleared request", () => {
  const cleared = {
    ...request(),
    legal_status: "approved",
    risk_status: "approved",
    compliance_status: "approved",
    marketing_status: "not_required",
  } as FundraiserRequest;

  const result = applyStageDecision(cleared, "cochair", "approved");
  assert.equal(result.status, "approved");
});
