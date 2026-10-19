# Aether

## Platform staff and reports

Update the repository files and restart on Wisp. Automatic schema setup adds `staff_roles`, `reports`, and `staff_audit` without modifying existing tables. If autoMigrate is disabled, import the updated schema.sql or run `npm run migrate`.

Create your account normally, then open `staff-owner.sql` in your database SQL editor (for example phpMyAdmin). Replace `YOUR_USERNAME` with your existing Aether username and execute the script against the Aether database. Its final query must show your account with role **Owner**. No Wisp console command is needed. The script also upgrades older staff role tables to support Owner and records the assignment in the audit log. Sign out and back in afterward. Preserve private configuration during deployment.

The platform hierarchy is **Owner > Admin > Moderator**. Owners use **Manage staff** to assign or remove Admins and Moderators. Admins can assign or remove Moderators only; they cannot create Admins, alter other Admins, or alter Owners. Moderators cannot manage staff accounts. Nobody can change their own staff role through the panel, and Owner cannot be granted or removed through the API. Owner is a platform role separate from owning a community. Owner accounts show a gold staff badge. Existing Admins remain Admins after upgrading. Keep Owner assignments limited to the accounts you control; SQL administration can override application permissions.
Members use **Report community** to submit an encrypted-at-rest reason. Staff use **Staff reports** to review reports, investigate the reported community's channels and latest 100 messages, and resolve reports. Investigation is read-only and requires an open report on every request. It does not add staff to membership or grant posting, channel editing, invite visibility or access to other communities. Resolving the final open report removes investigation access for that community. Existing membership still grants ordinary membership access. Information already read cannot be recalled from a browser.

Owners and Admins can inspect the **Staff audit log** (latest 200 entries); queue access, investigation reads, role changes and resolutions are logged. This database log is not tamper-proof against database operators. The report queue shows the latest 100 reports. A reporter can submit at most five reports per hour. Platform staff roles are separate from community ownership. Profile and chat badges are derived from server-side roles: a violet star-shield for Admin and a teal check-shield for Moderator. No badge or client value grants authorization.

This feature does not grant access to future E2EE conversations. Reporting encrypted conversations will require explicit user-submitted evidence.

Browser-based community chat foundation for local development and Wisp testing. Node.js 22+ and MySQL 8+. No build step; Wisp entrypoint is **server.js**.

## Run locally

1. Create a dedicated MySQL development database and a user restricted to that database. Keep testing in a second database with a separate user.
2. Copy `config.example.js` to `config.local.js` and fill in the development connection.
3. Generate a message encryption key using the command in the example and put it in `messageKey`. Keep this key backed up separately from the database. Losing it makes stored messages unreadable; changing it does not re-encrypt existing messages.
4. Run `npm install`, then `npm run migrate`, then `npm start`.
5. Open http://localhost:3000 and create an account. Create a community, show its invite code, and use a second browser profile to register another test account and join.

The migration creates missing tables without dropping data. Future schema changes need versioned migrations. `schema.sql` can alternatively be imported manually. Use utf8mb4 as the database character set for emoji support.

## Wisp testing

### Panel-only development (recommended for this project)

1. Install/update the repository files and run `npm install` (the Node egg normally does this on startup). Set MAIN_FILE to `server.js`; use `node server.js`, not ts-node.
2. Start once. If no private configuration exists, Aether creates `config.wisp.js`, generates a random message key, prints setup instructions, and exits intentionally.
3. Open `config.wisp.js` in Wisp File Manager. Enter your MySQL host, port, username, password and database. Set `port` to your allocated Wisp port. `SERVER_PORT` is used as an initial suggestion when available. Keep `host` as `0.0.0.0`.
4. Set `origin` to the actual public HTTPS URL without a trailing slash, for example `https://aether.yourdomain.com`. Keep `secureCookies: true`. Route that domain through your HTTPS proxy/tunnel to the Wisp allocation.
5. Restart. Aether connects to MySQL and creates missing tables automatically before accepting requests. No separate migration console command is required. The MySQL user needs CREATE permission in this database. Set `autoMigrate: false` to manage schema manually instead.

Preserve and separately back up `config.wisp.js` across updates; it contains credentials and the message key. Never replace the key after storing messages. The file is ignored by Git. Existing `config.local.js` is still recognized; if both files exist, `config.wisp.js` wins. `AETHER_CONFIG` overrides both. Despite its filename, `config.local.js` also works on a public Wisp server.

The first startup deliberately stops until you replace the placeholder settings. This is setup, not a running deployment. The application requires HTTPS for public testing.

Upload this repository, install dependencies with `npm install`, and use `server.js` as MAIN_FILE. Copy the example into `config.local.js` on the host with the **testing** database credentials and a **different** generated message key. Set host to `0.0.0.0`, port to the Wisp allocation, origin to the exact public HTTPS URL (no trailing slash), and secureCookies to true. Run `npm run migrate` in the console before starting. Configure your HTTPS proxy/tunnel to reach the allocated port and restrict direct public access to that port. The application never trusts forwarded headers for authentication or rate limiting; a proxy sharing one source IP will share a rate limit among testers.

An alternative private config file can be selected with AETHER_CONFIG (relative to config.js). Defaults work without environment variables. Never upload local configuration to GitHub. Registration can be closed with registrationOpen=false after invited testers register. Invite codes grant membership to anyone holding them; invite revocation and expiry are not implemented yet.

## Working milestone

- Registration/login, scrypt password hashing, seven-day database-backed HttpOnly sessions, logout.
- Community creation and invite joining; owner-only channel creation.
- Membership-checked message reading/writing; latest 100 messages with three-second polling.
- AES-256-GCM message storage encryption, parameterized SQL, same-origin write checks, request limits, CSP, and safe text rendering. Links are deliberately plain text.
- Responsive dark browser interface. `GET /api/health` checks MySQL connectivity.

## Security boundaries and next milestones

**This is an early development prototype, not a secure business messenger. Community messages are server-readable. There are no end-to-end encrypted DMs yet.** The server holds the storage encryption key, which does not protect against server compromise. Usernames, membership and message metadata are not encrypted. No automated malicious-link detection is included. Do not use sensitive or production data.

Next: integration coverage with real MySQL; roles, moderation and invite revocation; passkeys/MFA and recovery; audited-protocol E2EE DMs with device verification and encrypted attachments; event-driven messaging; link protection with explicit privacy boundaries; independent security review. Voice, video, file uploads, profiles and subscriptions are outside this initial milestone. No payment system is included.

## Validation

`npm test` exercises password verification, unique encryption nonces, authenticated decryption and session hashing. Real MySQL integration and two-browser testing are required before opening testing to others. Keep encrypted database backups together with a separately protected backup of the corresponding message key.
