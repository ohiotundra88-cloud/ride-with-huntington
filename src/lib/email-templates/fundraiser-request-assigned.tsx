import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, button, container, footer, h1, header, main, text } from './brand'

interface Props {
  requestTitle?: string
  submitterName?: string
  submitterEmail?: string
  eventDate?: string
  recipientName?: string
  /** true when an admin moved the request to this captain */
  reassigned?: boolean
}

const SITE = 'https://www.ridewithhuntington.com'
const LINK = `${SITE}/admin/approvals`

function headline(title: string, reassigned: boolean) {
  return reassigned
    ? `“${title}” was moved to you for approval`
    : `“${title}” is waiting on your approval`
}

const FundraiserRequestAssignedEmail = ({
  requestTitle, submitterName, submitterEmail, eventDate, recipientName, reassigned,
}: Props) => {
  const title = requestTitle?.trim() || 'A fundraiser request'
  const head = headline(title, reassigned === true)

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
            {reassigned
              ? 'This fundraiser request has been moved to you for the captain review.'
              : 'A colleague picked you as the captain to review their fundraiser request.'}
            {' '}You are the first stage — once you approve, it moves on to Legal, Risk, Compliance and
            Marketing, then to the co-chairs.
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
          <Text style={{ ...text, margin: '0' }}>You can approve, request changes, or deny with a comment: {LINK}</Text>
          <Text style={footer}>Fundraiser approvals · Internal colleague resource</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: FundraiserRequestAssignedEmail,
  subject: (data: Record<string, any>) =>
    headline(String(data?.['requestTitle'] ?? 'A fundraiser request'), data?.['reassigned'] === true),
  displayName: 'Fundraiser request assigned to captain',
  previewData: {
    requestTitle: 'Cornhole tournament',
    submitterName: 'Jordan Lee',
    submitterEmail: 'jordan.lee@huntington.com',
    eventDate: 'Saturday, July 18, 2026',
    recipientName: 'Casey',
    reassigned: false,
  },
} satisfies TemplateEntry
