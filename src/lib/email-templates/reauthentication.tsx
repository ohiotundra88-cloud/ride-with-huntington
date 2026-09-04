import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as s from './brand'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
}

export const ReauthenticationEmail = ({
  token,
  siteName = 'Team Huntington Hub',
}: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code: {token}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}>
          <Text style={s.brandMark}>{siteName}</Text>
        </Section>
        <Heading style={s.h1}>Confirm it's you</Heading>
        <Text style={s.text}>Enter this 6-digit code to confirm your identity.</Text>
        <Section style={s.codeBox}>
          <Text style={s.codeText}>{token}</Text>
        </Section>
        <Text style={s.text}>This code expires shortly and can be used once.</Text>
        <Text style={s.footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
