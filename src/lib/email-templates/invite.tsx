import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}>
          <Text style={s.brandMark}>{siteName}</Text>
        </Section>
        <Heading style={s.h1}>You've been invited</Heading>
        <Text style={s.text}>
          You've been invited to join {siteName}, the internal hub for Team
          Huntington's Pelotonia riders and volunteers.
        </Text>
        <Text style={s.text}>
          Accept below, or go to {siteUrl} and sign in with your Huntington
          email address — we'll email you a verification code to activate access.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Accept invitation
        </Button>
        <Text style={s.footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
