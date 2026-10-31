# Enerbuff UI

React Native frontend built with Expo SDK 54 and TypeScript for Android, iOS, and web.

The backend is a separate project (`enerbuff_Main_Backend`). Follow that project's
README for API startup, database setup,
migrations, staff review commands, and backend tests.

## Run locally

Use Node.js 24 LTS (`.nvmrc`), or Node.js 22.13 or newer, and npm.
Open a terminal in this repository's root and run:

```powershell
npm ci
# Only create .env if it does not already exist.
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run web
```

The welcome UI can run without the backend. Login, registration, saved facility
setup, and team access require the separate API running on port 4000. This
repository does not include the API or its database.

Set `EXPO_PUBLIC_API_URL` in `.env` to the API address and restart Expo after
changing it. This public value is included in the app bundle; keep database
credentials and server secrets in the backend project.

| Target | API address |
| --- | --- |
| Browser / iOS simulator | `http://localhost:4000` (default) |
| Android emulator | `http://10.0.2.2:4000` (default when the variable is unset) |
| Physical phone | `http://<computer-LAN-IP>:4000` |

For a phone, use the same network as the computer and configure the backend to
listen on `HOST=0.0.0.0`. For web, ensure the backend's `CORS_ORIGINS` includes the
Expo web origin. See the backend README for these settings.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start Expo and show device connection instructions. |
| `npm run web` | Start the browser preview. |
| `npm run android` | Start Expo for an Android emulator/device. |
| `npm run ios` | Start Expo for the iOS simulator (requires macOS/Xcode). |
| `npm run typecheck` | Check TypeScript without generating files. |
| `npm test` | Run the frontend role and screen tests. |
| `npm run check` | Run TypeScript and frontend tests. |
| `npm run test:roles` | Check frontend role routing and screen controls. |
| `npm run start:clear` | Restart Expo with a cleared bundler cache. |
| `npm run build:web` | Export the web app to `dist/`. |

For a physical device, use an Expo Go version compatible with SDK 54. Native
bundles alone do not produce an installable APK or IPA.

## Source layout

```text
App.tsx                  Navigation, session state, and setup flow
src/api/auth.ts          HTTP client and API response types
src/screens/             Welcome, authentication, setup, dashboards, team access
src/components/          Shared controls, profile menu, charts, complaint form
src/permissions.ts       Frontend role and setup navigation rules
src/registrationTerms.ts Registration consent text and version
src/types.ts             UI types
src/data.ts              Illustrative energy and asset data
src/theme.ts             Colors and theme values
src/styles.ts            Shared styles
src/Illustrations.tsx    SVG artwork
assets/                  Image assets
scripts/roles.test.cjs   Frontend rendering and access-control tests
.env.example             Public API URL example
app.json                 Expo configuration
```

`src/api/auth.ts` and the public API URL configuration belong to the frontend:
they connect screens to the separate service. Server code, database migrations,
and backend dependencies are maintained in the backend project.

## App behavior

- Registration checks a 12-digit Consumer Number and requires registration
  consent. Login uses a mobile number and OTP. The current development OTP is
  `123456`; no SMS is sent.
- Organization access and roles come from authenticated API responses. Pending,
  rejected, and revoked memberships show their access status.
- First-time admins complete three visible setup steps: Facility & electricity
  data, Flexible assets, and Flexibility potential. Progress saves through the
  API and resumes after login. Other approved roles can view setup read-only.
- Admins manage member requests, roles, revocation, and restored access through
  Team Access. Approved members can submit complaints from the profile menu.
- The session token stays in memory; reloading requires login again. Membership
  refreshes on navigation and foreground events, reusing results for 10 seconds.
- Energy dashboards, incentives, and meter connection remain illustrative.

## Troubleshooting

If login cannot reach the API, check that the separate backend is running and
`EXPO_PUBLIC_API_URL` matches the target device. Restart Expo after editing `.env`.

If PowerShell blocks `npm.ps1`, use `npm.cmd` and `npx.cmd` instead.

For editor TypeScript errors, install dependencies and run `npm run typecheck`.
If that passes, select **Use Workspace Version** for TypeScript in VS Code and
restart its TypeScript server.
