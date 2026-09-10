import React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, container, footer, h1, header, main, text } from './brand'

interface Props {
  eventTitle?: string
  whenWhere?: string
  recipientName?: string
  organizerName?: string
}

const EventCancelledEmail = ({ eventTitle, whenWhere, recipientName, organizerName }: Props) => {
  const title = eventTitle?.trim() || 'A Team Huntington event'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Cancelled: ${title}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>Team Huntington Hub</Text>
          </Section>

          <Text style={{ ...text, color: '#8a1c1c', fontWeight: 'bold' as const, margin: '0 0 10px' }}>
            Cancelled
          </Text>
          <Heading style={h1}>{`Cancelled: ${title}`}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName},` : 'Hi there,'}</Text>
          <Text style={text}>This event has been cancelled — no action is needed from you.</Text>
          {whenWhere?.trim() ? (
            <Text style={{ ...text, fontWeight: 'bold' as const, color: '#002D2A' }}>
              Was scheduled for {whenWhere}
            </Text>
          ) : null}

          <Hr style={{ borderColor: '#e4e8e6', margin: '4px 0 16px' }} />
          <Text style={footer}>
            Sent to Team Huntington colleagues{organizerName ? ` by ${organizerName}` : ''} · Internal colleague resource
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EventCancelledEmail,
  subject: (data: Record<string, any>) =>
    `Cancelled: ${String(data?.['eventTitle'] ?? '').trim() || 'a Team Huntington event'}`,
  displayName: 'Event cancelled',
  previewData: {
    eventTitle: 'Team Huntington kickoff breakfast',
    whenWhere: 'Friday, June 5 · 8:00 AM – 9:30 AM · Easton Campus, Room 2A',
    recipientName: 'Jordan',
    organizerName: 'Chris Kemper',
  },
} satisfies TemplateEntry
