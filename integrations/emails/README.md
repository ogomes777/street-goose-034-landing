# Street Goose email identity

The notification worker renders a branded, table-based HTML email plus a plain-text alternative. It uses the real notification title/body, the existing verified sender and channel preferences. Delivery quotas and retry/idempotency behavior stay unchanged.

- `notification.html`: layout used by the database renderer for orders, XP, ranking, rewards, coupons, approved posts, campaigns, inactivity and admin notices.
- `confirm-account.html`: Supabase Auth confirmation template; uses `{{ .ConfirmationURL }}`.
- `login-code.html`: Supabase Magic Link/OTP template; preserves `{{ .Token }}` for code-based login.
- `password-recovery.html`: Supabase Auth recovery template; uses `{{ .ConfirmationURL }}`.

Auth files must be saved in the corresponding Supabase Authentication email templates. They do not become active just by existing in this repository or by creating a template in Resend. SMTP transport and custom account notification rendering are separate configurations.

The sender address is not a Gmail mailbox or Google account. Resend domain verification authenticates sending. The inbox avatar is controlled by the recipient provider, a matching account profile where supported, or BIMI certification; branding the HTML does not assign a Gmail avatar or a blue checkmark. Gmail BIMI needs VMC/CMC and compliant domain authentication. No paid certificate is purchased by this implementation.

The sender currently does not have inbound receiving enabled. Replies are not represented as a monitored support inbox; customers are directed to the store’s existing support channel.
