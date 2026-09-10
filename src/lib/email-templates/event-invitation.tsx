import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, button, container, footer, h1, header, main, text } from './brand'

interface Props {
  eventTitle?: string
  whenWhere?: string
  description?: string
  organizerName?: string
  recipientName?: string
  ctaHref?: string
}

const SITE = 'https://www.ridewithhuntington.com'

const EventInvitationEmail = ({
  eventTitle, whenWhere, description, organizerName, recipientName, ctaHref,
}: Props) => {
  const title = eventTitle?.trim() || 'A Team Huntington event'
  const href = ctaHref?.trim()
    ? ctaHref.startsWith('http') ? ctaHref : `${SITE}${ctaHref.startsWith('/') ? '' : '/'}${ctaHref}`
    : `${SITE}/my-events`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`You're invited: ${title}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>Team Huntington Hub</Text>
          </Section>

          <Heading style={h1}>{`You're invited: ${title}`}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName},` : 'Hi there,'}</Text>

          {whenWhere?.trim() ? (
            <Text style={{ ...text, fontWeight: 'bold' as const, color: '#002D2A' }}>{whenWhere}</Text>
          ) : null}

          {description?.trim() ? (
            <Text style={{ ...text, whiteSpace: 'pre-line' as const }}>{description}</Text>
          ) : null}

          <Text style={text}>Please let us know if you can make it.</Text>

          <Section style={{ margin: '0 0 22px' }}>
            <Button href={href} style={button}>RSVP now</Button>
          </Section>

          <Hr style={{ borderColor: '#e4e8e6', margin: '4px 0 16px' }} />
          <Text style={{ ...text, margin: '0' }}>You can RSVP any time in the Hub: {href}</Text>
          <Text style={footer}>
            Sent to Team Huntington colleagues{organizerName ? ` by ${organizerName}` : ''} · Internal colleague resource
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EventInvitationEmail,
  subject: (data: Record<string, any>) =>
    `You're invited: ${String(data?.['eventTitle'] ?? '').trim() || 'a Team Huntington event'}`,
  displayName: 'Event invitation',
  previewData: {
    eventTitle: 'Team Huntington kickoff breakfast',
    whenWhere: 'Friday, June 5 · 8:00 AM – 9:30 AM · Easton Campus, Room 2A',
    description: 'Coffee, pastries and a look at the season ahead.',
    organizerName: 'Chris Kemper',
    recipientName: 'Jordan',
    ctaHref: '/my-events',
  },
} satisfies TemplateEntry
