# Why the test email hasn't arrived

## What I checked

- Your sender domain `notify.ridewithhuntington.com` is verified and active — nothing wrong with the setup.
- Your address is not blocked or unsubscribed.
- Delivery history shows the last real email went out on Sep 6. There is no record of any send today.
- The site's log shows no email errors, and the sending code, templates and the Super User Test Emails page are all correctly wired.

## The cause

Emails sent from the preview version of the site are treated as test-mode: they are accepted but never actually delivered, and they leave no delivery record. Real delivery only happens from the published (live) site. That matches exactly what we see: no error, no record, no email.

## What to do

1. Publish the app.
2. Open the live site, sign in as a Super User, go to Super User -> Test Emails.
3. Click "Send all four". Each of the four sample emails (team announcement, event invitation, event cancellation, fundraiser decision) goes to your own address with `[TEST]` in the subject.
4. If anything still doesn't arrive, I'll pull the delivery record for that exact send and tell you whether it was accepted, bounced, or refused — and check your spam folder first, since first-time sends from a new domain often land there.

## Code changes

None needed. The email setup, templates, and send path are all correct; the only missing step is publishing.
