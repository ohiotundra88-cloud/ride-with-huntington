import type { TemplateEntry } from "./define-template";
import { template as teamAnnouncementTemplate } from "./team-announcement";
import { template as eventInvitationTemplate } from "./event-invitation";
import { template as eventCancelledTemplate } from "./event-cancelled";
import { template as fundraiserDecisionTemplate } from "./fundraiser-decision";
import { template as fundraiserRequestAssignedTemplate } from "./fundraiser-request-assigned";
import { template as fundraiserReviewNeededTemplate } from "./fundraiser-review-needed";

export type { TemplateEntry, TemplateData } from "./define-template";

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "team-announcement": teamAnnouncementTemplate,
  "event-invitation": eventInvitationTemplate,
  "event-cancelled": eventCancelledTemplate,
  "fundraiser-decision": fundraiserDecisionTemplate,
  "fundraiser-request-assigned": fundraiserRequestAssignedTemplate,
  "fundraiser-review-needed": fundraiserReviewNeededTemplate,
};
