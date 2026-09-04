import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Team Huntington Hub"
const SENDER_DOMAIN = "notify.ridewithhuntington.com"
const ROOT_DOMAIN = "ridewithhuntington.com"
const FROM_DOMAIN = "ridewithhuntington.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { logAuthEmail } = await import('@/lib/auth-email-log.server')
        // Audit trail: one timeline entry per auth email, with type + recipient.
        const audit = (type: string, subject: string, email: string) => {
          void logAuthEmail({ email, type, subject })
        }
        const handler = createAuthEmailHandler({
          apiKey: process.env['LOVABLE_API_KEY']!,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env['LOVABLE_SEND_URL'],
          emails: {
            signup: {
              subject: 'Your Team Huntington Hub verification code',
              render: (data) => {
                audit('signup', 'Your Team Huntington Hub verification code', data.email)
                return React.createElement(SignupEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  recipient: data.email,
                  token: data.token ?? '',
                })
              },
            },
            invite: {
              subject: "You've been invited",
              render: (data) => {
                audit('invite', "You've been invited", data.email)
                return React.createElement(InviteEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  confirmationUrl: data.url,
                })
              },
            },
            magiclink: {
              subject: 'Your Team Huntington Hub sign-in code',
              render: (data) => {
                audit('magiclink', 'Your Team Huntington Hub sign-in code', data.email)
                return React.createElement(MagicLinkEmail, {
                  siteName: SITE_NAME,
                  token: data.token ?? '',
                })
              },
            },
            recovery: {
              subject: 'Reset your password',
              render: (data) => {
                audit('recovery', 'Reset your password', data.email)
                return React.createElement(RecoveryEmail, {
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                })
              },
            },
            email_change: {
              subject: 'Confirm your new email',
              render: (data) => {
                audit('email_change', 'Confirm your new email', data.email)
                return React.createElement(EmailChangeEmail, {
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? '',
                  email: data.email,
                  newEmail: data.new_email ?? '',
                  confirmationUrl: data.url,
                })
              },
            },
            reauthentication: {
              subject: 'Your verification code',
              render: (data) => {
                audit('reauthentication', 'Your verification code', data.email)
                return React.createElement(ReauthenticationEmail, { token: data.token ?? '' })
              },
            },
          },
        })
        return handler(request)
      },
    },
  },
})
