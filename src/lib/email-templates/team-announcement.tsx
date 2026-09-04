import React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { brandMark, button, container, footer, h1, header, main, text } from './brand'

interface Props {
  title?: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  recipientName?: string
  priority?: string
  fromEmail?: string
  hubUrl?: string
}

const SITE = 'https://www.ridewithhuntington.com'

const priorityStyle = (priority?: string) => {
  if (priority === 'urgent') return { ...text, color: '#8a1c1c', fontWeight: 'bold' as const, margin: '0 0 10px' }
  if (priority === 'important') return { ...text, color: '#7a5200', fontWeight: 'bold' as const, margin: '0 0 10px' }
  return null
}

const AnnouncementEmail = ({
  title, body, ctaLabel, ctaHref, recipientName, priority, fromEmail, hubUrl,
}: Props) => {
  const heading = title?.trim() || 'A new Team Huntington update'
  const message = body?.trim() || ''
  const link = ctaHref?.trim()
    ? ctaHref.startsWith('http')
      ? ctaHref
      : `${SITE}${ctaHref.startsWith('/') ? '' : '/'}${ctaHref}`
    : ''
  const inbox = hubUrl?.trim() || `${SITE}/inbox`
  const badge = priorityStyle(priority)

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>Team Huntington Hub</Text>
          </Section>

          {badge ? <Text style={badge}>{priority === 'urgent' ? 'Urgent' : 'Important'}</Text> : null}
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName},` : 'Hi there,'}</Text>

          {message.split(/\n{2,}/).map((paragraph, i) => (
            <Text key={i} style={{ ...text, whiteSpace: 'pre-line' as const }}>
              {paragraph}
            </Text>
          ))}

          {link && ctaLabel?.trim() ? (
            <Section style={{ margin: '0 0 22px' }}>
              <Button href={link} style={button}>{ctaLabel}</Button>
            </Section>
          ) : null}

          <Hr style={{ borderColor: '#e4e8e6', margin: '4px 0 16px' }} />
          <Text style={{ ...text, margin: '0' }}>
            You can also read this and past updates in the Hub: {inbox}
          </Text>
          <Text style={footer}>
            Sent to Team Huntington colleagues{fromEmail ? ` by ${fromEmail}` : ''} · Internal colleague resource
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AnnouncementEmail,
  subject: (data: Record<string, any>) =>
    String(data?.['title'] ?? '').trim() || 'A new Team Huntington update',
  displayName: 'Team announcement',
  previewData: {
    title: 'Hotel block closes Friday',
    body: 'The Team Huntington room block at the Hilton closes this Friday at 5pm.\n\nBook now so you keep the team rate for ride weekend.',
    ctaLabel: 'Book your hotel',
    ctaHref: '/dashboard',
    recipientName: 'Jordan',
    priority: 'important',
    fromEmail: 'captain@huntington.com',
  },
} satisfies TemplateEntry
