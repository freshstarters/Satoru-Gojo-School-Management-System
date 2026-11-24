# Authentication

Gojo, the platform, and each core school keep separate accounts. The same email may exist once in each of those buckets. Every account has an email. A phone number is optional and, when set, is stored as a Liberian `+231` number with nine national digits.

Sign-in accepts the email or the phone. `0770123456`, `770123456`, `231770123456`, and `+231770123456` are the same number. A wrong password, an inactive account, and an account in a different bucket all return the same `401` response.

There is no public registration endpoint.

## Tokens

`POST` login returns a bearer access token that lasts 15 minutes. The token carries `app_scope` (`demo` or `core`), `tenant_slug` (empty for Gojo and for a platform admin), and `role` (empty until memberships exist). A Gojo token is rejected on `/api/v1/`. A core token is rejected on `/api/demo/v1/`. A school token is rejected for any other school.

The refresh token is an `HttpOnly`, `SameSite=Lax` cookie. It is `Secure` when `DEBUG` is false, lasts 7 days, and is stored only as a SHA-256 hash. Cookie names are `refresh_demo`, `refresh_<school-slug>`, and `refresh_platform`. Each cookie is limited to that API's auth prefix and is not shared across hosts.

Refreshing a cookie revokes that cookie and sets a new one. Other schools, Gojo, and platform stay signed in. Logging out revokes only that browser session. Presenting a cookie that was already rotated revokes every refresh token for that one account.

`GET /auth/sessions/` lists the valid refresh cookies the browser sent. It returns the account kind, user id, email, tenant slug, and `issued_at`. It does not return tokens and it does not rotate cookies. An empty list is `200`.

## Doors

Gojo uses `/api/demo/v1/auth/` for `login/`, `google/`, `refresh/`, `logout/`, `me/`, `config/`, and `sessions/`. The tenant header is ignored. A bad or expired bearer on `config/`, `login/`, `google/`, `refresh/`, `logout/`, and `sessions/` is ignored. A valid core token on any Gojo path is still rejected. `GET /auth/me/` still requires a valid Gojo token.

A core school uses the same paths under `/api/v1/auth/`. Login, Google, refresh, and logout require an active school: `X-Tenant-Slug` when routing is `header_path`, or the school host when routing is `subdomain`. A missing header is `400`. An unknown host is `404`. A suspended school is `403`.

Platform sign-in uses `/api/v1/auth/platform/login/`, `google/`, `refresh/`, and `logout/`. These reject a school slug header. On a subdomain deployment the host is `platform.<base-domain>`.

Login and Google, refresh, and logout require the CSRF token from `GET /auth/config/` in the `X-CSRFToken` header, along with the CSRF cookie. Login and Google are limited to 5 requests per minute per IP.

`GET /auth/me/` reads the bearer token. A school header, when sent, must match the token. In subdomain mode the host must be that school's host. A platform profile is served only on `platform.<base-domain>`.

## Google sign-in

`POST .../auth/google/` accepts `{ "id_token" }`. The backend checks the token signature, issuer, audience (`GOOGLE_OAUTH_CLIENT_ID`), expiry, and `email_verified`. The email must already belong to an active account in that bucket. Google sign-in does not create accounts.

If `GOOGLE_OAUTH_CLIENT_ID` or `GOOGLE_OAUTH_CLIENT_SECRET` is blank, the endpoint returns `503` and does not call Google. `GET /auth/config/` reports `google_enabled` and does not include either secret.

## Privacy notice

`GET /auth/config/` returns `hosting_region`, `data_controller_name`, and a `privacy_notice` object. When either setting is blank, `privacy_notice.configured` is false and `warning` says the notice is not configured. The notice also states that guardians can opt in or out of SMS.

## Roles

An account can hold more than one role. A permission check passes when any of those roles allows the action. The access token still carries one `role` string, the highest of `platform_super_admin`, `principal`, `registrar`, `bursar`, `teacher`, `support_staff`, `parent`, and `student`. An account with no role sends an empty string. `platform_super_admin` belongs only on a platform account.

`GET` and writes on divisions and subjects allow the principal, registrar, bursar, and teacher to read. Only the principal and registrar may write. Everyone else, including a token with no role, receives `403`.

## Invites

There is no public registration route. A principal or platform super admin may invite any school role. A registrar may invite a teacher, support staff member, parent, or student. Only a platform super admin may grant `platform_super_admin`, from `/api/v1/auth/platform/invites/`.

`POST .../auth/invites/` requires `email`, `role`, and `display_name`. Phone is optional. The invite does not take a campus. A new person is created inactive, and the email contains a single-use token that expires in 72 hours. The response reports `delivery` and never includes the token. A live unused invite blocks another invite. An expired invite does not. An active account that lacks the role receives it immediately and no token is sent. An active account that already has the role returns `400`.

`POST .../auth/invites/<id>/revoke/` removes a live invite. The pending role is removed. If that person never activated and has no roles left, the account is deleted.

`POST .../auth/invites/accept/` takes the token and either a password or a Google `id_token`. Sending both or neither returns `400`. The Google email must match the invited account. Accept marks the account active and starts a session. A used or expired token with no matching `Idempotency-Key` returns `400` and "This invite is invalid." The same key and body checks the password or Google token again and starts a new session. The access token is not stored. A failed check returns `400`, `invite_used`, and "This invite was already used. Sign in." A different body with that key returns `409`.

When `DEBUG` is true, mail is printed to the console. When `DEBUG` is false and the SMTP settings are incomplete, the invite is still stored, `delivery` is `UNCONFIGURED`, and nothing is sent.

## Password reset

`POST .../auth/password-reset/request/` always returns the same sentence. An active account matched by email or by phone receives one token by email, sent to the address on the account. The token expires in one hour. An unknown or inactive login receives nothing and writes no SMS log. The same `Idempotency-Key` and body does not send a second email.

`POST .../auth/password-reset/confirm/` sets the new password and revokes every refresh token for that account. It does not start a session. A used or expired token returns `400`.

Request, confirm, and invite accept are limited to 5 requests per minute per IP and use the same CSRF check as login.

## Sessions

`GET /auth/sessions/` lists the valid refresh cookies the browser sent. Each row includes `session_id` and `issued_at`. `DELETE /auth/sessions/<session_id>/` revokes that one cookie. Other devices stay signed in. Password reset still revokes every device.

## Idempotency

`Idempotency-Key` is honored on invite creation, invite revoke, invite accept, password-reset request, password-reset confirm, and division and subject updates. The same key and body returns the stored response for 7 days and does not write another row. Invite accept stores only an accepted marker and starts a new session on replay. The same key with a different body returns `409` and `idempotency_conflict`. Login, refresh, logout, and Google sign-in ignore the key.

`If-Unmatched-Since` on a division or subject update returns `409` and `SYNC_CONFLICT` with `server_record` when the stored `updated_at` is newer. An equal timestamp is not a conflict.

## Local seed

`python manage.py seed_gojo_demo` creates four active Gojo accounts when `DEBUG` is true and `SEED_GOJO_PASSWORD` is set:

- `samuel.kollie@gojo.test`, Dr. Samuel Kollie, principal
- `beatrice.toe@gojo.test`, Beatrice Toe, registrar
- `joseph.freeman@gojo.test`, Joseph Freeman, bursar
- `grace.johnson@gojo.test`, Grace Johnson, teacher

Running it again does not duplicate rows, and it does not change an existing password or display name. The same command also creates the campus student and teacher logins described in School settings. The password stays in `.env`.

## Browser client

The Gojo Institute client calls relative `/api/demo/v1/` and sends credentials on every request. The access token stays in memory. `GET /auth/config/` supplies `csrf_token`, which the client copies into `X-CSRFToken` on unsafe auth requests. A `401` on a signed-in request refreshes `refresh_demo` once and retries. Login, Google sign-in, refresh, and logout do not send `Idempotency-Key`. Invite acceptance, password-reset request, and password-reset confirmation do. The client keeps one key while the submitted fields stay the same and uses a new key when those fields change.

Each workspace pane has its own address: `/dashboard`, `/students`, `/admissions`, `/fees`, `/classes`, `/attendance`, `/grades`, `/teachers`, `/parents`, `/library`, `/transport`, `/announcements`, and `/settings`. A refresh reopens that address. Public screens are `/login`, `/invite`, `/forgot-password`, `/reset-password`, and `/privacy`. Invite and reset screens read `?token=` and also accept a pasted token.

When `GOJO_APP_ORIGIN` is set, demo invite and reset emails add a second line with that origin and `/invite?token=` or `/reset-password?token=`. A blank origin omits the link. The token sentence stays in the message. Dates and times in the client use `Africa/Monrovia`. The topbar `LRD` / `+ USD` choice is stored in this browser.

