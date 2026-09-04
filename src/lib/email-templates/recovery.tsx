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

interface RecoveryEmailProps {
  siteName: string
  token: string
}

/**
 * Password reset email. Code-only by design: corporate web filters block
 * click-through links.
 */
export const RecoveryEmail = ({ siteName, token }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} password reset code: {token}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.header}>
          <Text style={s.brandMark}>{siteName}</Text>
        </Section>
        <Heading style={s.h1}>Reset your password</Heading>
        <Text style={s.text}>
          Enter the code from this email on the sign-in screen to choose a new password.
        </Text>
        <Section style={s.codeBox}>
          <Text style={s.codeText}>{token}</Text>
        </Section>
        <Text style={s.text}>This code expires in 10 minutes and can be used once.</Text>
        <Text style={s.footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
