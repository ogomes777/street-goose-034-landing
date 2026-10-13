# Street Goose: activity and notifications

Customer details stay in the private Supabase table. The CRM reads that table under admin authorization; the Ramon spreadsheet is a scheduled, read-only mirror of the same source.

## Public activity

The landing subscribes to `store_live_events`, with a bounded recent-history read on connection, reconnection, foreground return and a 60-second fallback. The latest five events use a stable date/id order. Realtime is best effort; delivery times can differ across networks.

- Cart additions and new favorites are anonymous, explicit opt-in, authenticated and catalog-validated. No names, contact details, addresses, user IDs or order IDs appear in the public feed.
- One user/product/action is limited to one event in 30 minutes; each account is limited to twelve intents per hour.
- Approved community posts and orders transitioning to `paid` originate in server triggers.
- WhatsApp orders create an anonymous contact-intent event only with sharing consent. This does not prove a WhatsApp message was delivered or a purchase completed.
- No fabricated events or simulated visitors. Empty history is shown honestly.
- Events and private throttling records expire after 24 hours via cron. Public reads also enforce the 24-hour boundary through RLS.

## Private channels

Own-account notices use the existing notification table and Realtime channel. The admin receives new-account, order and pending-community-review notices. Global CRM controls and customer preferences govern each channel. Public activity is not broadcast as push/email to every customer.

Email uses the Resend worker budget. Push uses stored device subscriptions and the minute worker. No open browser is required after a supported device has subscribed. iOS web push requires a Home Screen app; other supported browsers may allow push without installation. OS permissions, connectivity and notification settings still govern display. A lead without a signed-in account/device subscription does not receive this account push.

## Device verification

Account > Preferences > Activate on this device > Test notice on my account. The self-test requires push and order notices enabled, a registered subscription and enabled server controls; it is limited to one per five minutes and accepts no recipient parameter. A queued message or an in-app notice does not prove physical device delivery. Close the site and confirm the OS notification, then click it to reopen the account.

## Validation

Production build and service tests cover the frontend. Transactional SQL validation covers anonymous access, required sharing consent, duplicate throttling and rejection of unknown catalog products/action types; test transactions are rolled back. Actual cross-device reception and simultaneous customer sessions must be validated with subscribed devices and real authorized customer actions.

## Community followers

Public profile creation (first public handle), opt-in anonymous login and opted-in public profile edits are server events. Activity followers opt in through Account > Preferences. Private community notifications are grouped to one per account per 15 minutes, with push enabled and email disabled by default at the CRM control. This avoids broadcasting every cart gesture as an external interruption. Visitors can view the public feed without signing in; external delivery requires an account, channel consent and a subscribed device.
