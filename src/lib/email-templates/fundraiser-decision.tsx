import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, button, container, footer, h1, header, main, text } from './brand'

interface Props {
  requestTitle?: string
  /** approved | declined | changes_requested | fully_approved */
  decision?: string
  stageLabel?: string
  comment?: string
  recipientName?: string
  reviewerEmail?: string
}

const SITE = 'https://www.ridewithhuntington.com'
const LINK = `${SITE}/fundraiser-request`

function headline(decision: string, stageLabel: string, title: string) {
  if (decision === 'fully_approved') return `“${title}” is fully approved`
  if (decision === 'declined') return `${stageLabel} denied “${title}” — needs your attention`
  if (decision === 'changes_requested') return `${stageLabel} requested changes on “${title}”`
  return `${stageLabel} approved “${title}”`
}

function bodyCopy(decision: string) {
  if (decision === 'fully_approved')
    return 'Every reviewer has signed off — your fundraiser is headed to the Team Huntington calendar.'
  if (decision === 'declined')
    return 'Your request needs another look. Review the note below, update your request and resubmit it.'
  if (decision === 'changes_requested')
    return 'A reviewer asked for changes before this can move forward. Update your request and resubmit it.'
  return 'One more approval is in. We will let you know as the remaining reviewers sign off.'
}

const FundraiserDecisionEmail = ({
  requestTitle, decision, stageLabel, comment, recipientName, reviewerEmail,
}: Props) => {
  const title = requestTitle?.trim() || 'your fundraiser request'
  const kind = decision?.trim() || 'approved'
  const stage = stageLabel?.trim() || 'A reviewer'
  const attention = kind === 'declined' || kind === 'changes_requested'
  const head = headline(kind, stage, title)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{head}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>Team Huntington Hub</Text>
          </Section>

          {attention ? (
            <Text style={{ ...text, color: '#8a1c1c', fontWeight: 'bold' as const, margin: '0 0 10px' }}>
              Needs your attention
            </Text>
          ) : null}
          <Heading style={h1}>{head}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName},` : 'Hi there,'}</Text>
          <Text style={text}>{bodyCopy(kind)}</Text>

          {comment?.trim() ? (
            <Text
              style={{
                ...text,
                whiteSpace: 'pre-line' as const,
                backgroundColor: '#f6f8f7',
                borderLeft: '3px solid #7ECF1C',
                padding: '12px 14px',
              }}
            >
              {`Reviewer note: ${comment.trim()}`}
            </Text>
          ) : null}

          <Section style={{ margin: '0 0 22px' }}>
            <Button href={LINK} style={button}>
              {attention ? 'Edit & resubmit' : 'View request status'}
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e4e8e6', margin: '4px 0 16px' }} />
          <Text style={{ ...text, margin: '0' }}>You can track every stage in the Hub: {LINK}</Text>
          <Text style={footer}>
            Fundraiser approvals{reviewerEmail ? ` · reviewed by ${reviewerEmail}` : ''} · Internal colleague resource
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FundraiserDecisionEmail,
  subject: (data: Record<string, any>) =>
    headline(
      String(data?.['decision'] ?? 'approved'),
      String(data?.['stageLabel'] ?? 'A reviewer'),
      String(data?.['requestTitle'] ?? 'your fundraiser request'),
    ),
  displayName: 'Fundraiser decision',
  previewData: {
    requestTitle: 'Pancake breakfast',
    decision: 'declined',
    stageLabel: 'Risk',
    comment: 'Please add the certificate of insurance for the venue before resubmitting.',
    recipientName: 'Jordan',
    reviewerEmail: 'risk@huntington.com',
  },
} satisfies TemplateEntry
