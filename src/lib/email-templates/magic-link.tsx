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

interface MagicLinkEmailProps {
  siteName: string
  token: string
}

/**
 * Sign-in passcode email. Code-only by design: corporate web filters block
 * click-through sign-in links.
 */
export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} sign-in code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandMark}>{siteName}</Text>
        </Section>
        <Heading style={h1}>Your sign-in code</Heading>
        <Text style={text}>Enter this 6-digit code on the sign-in screen to continue.</Text>
        <Section style={codeBox}>
          <Text style={codeText}>{token}</Text>
        </Section>
        <Text style={text}>This code expires in 10 minutes and can be used once.</Text>
        <Text style={footer}>
          If you didn't try to sign in, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 26px', maxWidth: '520px' }
const header = { borderBottom: '3px solid #7ECF1C', paddingBottom: '10px', marginBottom: '22px' }
const brandMark = {
  margin: '0',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.04em',
  color: '#002D2A',
  textTransform: 'uppercase' as const,
}
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#002D2A', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#44514e', lineHeight: '1.6', margin: '0 0 18px' }
const codeBox = {
  backgroundColor: '#f2fae6',
  border: '1px solid #7ECF1C',
  borderRadius: '10px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const codeText = {
  margin: '0',
  fontSize: '34px',
  lineHeight: '1.2',
  fontWeight: 'bold' as const,
  letterSpacing: '0.22em',
  color: '#002D2A',
}
const footer = { fontSize: '12px', color: '#8a938f', margin: '26px 0 0' }
