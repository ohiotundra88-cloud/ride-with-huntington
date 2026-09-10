import type { ComponentType } from 'react'
import { template as teamAnnouncementTemplate } from './team-announcement'
import { template as eventInvitationTemplate } from './event-invitation'
import { template as eventCancelledTemplate } from './event-cancelled'
import { template as fundraiserDecisionTemplate } from './fundraiser-decision'


export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'team-announcement': teamAnnouncementTemplate,
  'event-invitation': eventInvitationTemplate,
  'event-cancelled': eventCancelledTemplate,
  'fundraiser-decision': fundraiserDecisionTemplate,
}
