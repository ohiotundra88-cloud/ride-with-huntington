import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, button, container, footer, h1, header, main, text } from './brand'

interface Props {
  requestTitle?: string
  /** Human label for the stage now waiting on this reviewer, e.g. "Legal". */
  stageLabel?: string
  submitterName?: string
  submitterEmail?: string
  eventDate?: string
  recipientName?: string
  /** true for the final co-chair sign-off stage */
  finalStage?: boolean
}

const SITE = 'https://www.ridewithhuntington.com'
const LINK = `${SITE}/admin/approvals`

function headline(title: string, stageLabel: string) {
  return `${stageLabel} review needed: “${title}”`
}

const FundraiserReviewNeededEmail = ({
  requestTitle, stageLabel, submitterName, submitterEmail, eventDate, recipientName, finalStage,
}: Props) => {
  const title = requestTitle?.trim() || 'A fundraiser request'
  const stage = stageLabel?.trim() || 'Reviewer'
  const head = headline(title, stage)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{head}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>Team Huntington Hub</Text>
          </Section>

          <Heading style={h1}>{head}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName},` : 'Hi there,'}</Text>
          <Text style={text}>
            The peloton captain has approved this fundraiser request, so it is now waiting on the{' '}
            {stage} review.
            {finalStage
              ? ' Yours is the final sign-off — once you approve, the fundraiser is fully approved and goes on the calendar.'
              : ' Legal, Risk, Compliance and Marketing can review in any order, and the co-chairs sign off last.'}
          </Text>

          <Text style={{ ...text, backgroundColor: '#f6f8f7', borderLeft: '3px solid #7ECF1C', padding: '12px 14px' }}>
            {`${title}`}
            {eventDate ? `\nEvent date: ${eventDate}` : ''}
            {submitterName || submitterEmail
              ? `\nSubmitted by: ${[submitterName, submitterEmail].filter(Boolean).join(' · ')}`
              : ''}
          </Text>

          <Section style={{ margin: '0 0 22px' }}>
            <Button href={LINK} style={button}>Review the request</Button>
          </Section>

          <Hr style={{ borderColor: '#e4e8e6', margin: '4px 0 16px' }} />
          <Text style={{ ...text, margin: '0' }}>
            You can approve, request changes, or deny with a comment: {LINK}
          </Text>
          <Text style={footer}>Fundraiser approvals · Internal colleague resource</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FundraiserReviewNeededEmail,
  subject: (data: Record<string, any>) =>
    headline(
      String(data?.['requestTitle'] ?? 'A fundraiser request'),
      String(data?.['stageLabel'] ?? 'Reviewer'),
    ),
  displayName: 'Fundraiser request needs your review',
  previewData: {
    requestTitle: 'Cornhole tournament',
    stageLabel: 'Legal',
    submitterName: 'Jordan Lee',
    submitterEmail: 'jordan.lee@huntington.com',
    eventDate: 'Saturday, July 18, 2026',
    recipientName: 'Casey',
    finalStage: false,
  },
} satisfies TemplateEntry
