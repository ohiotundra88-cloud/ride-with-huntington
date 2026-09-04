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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}>
          <Text style={s.brandMark}>{siteName}</Text>
        </Section>
        <Heading style={s.h1}>Confirm your email change</Heading>
        <Text style={s.text}>
          You requested to change the email address on your {siteName} account
          from {oldEmail} to {newEmail}.
        </Text>
        <Button style={s.button} href={confirmationUrl}>
          Confirm email change
        </Button>
        <Text style={s.footer}>
          If you didn't request this change, please secure your account
          immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
