# PricePulse Mobile — Development Plan

High-level plan for building, running, and developing the mobile app (Android device/emulator, iOS simulator, dev builds).

---

## 1. Current setup (done)

| Area | Status |
|------|--------|
| **Default start** | `yarn start` uses **dev build** (`--dev-client`), not Expo Go. Use `yarn start:go` for Expo Go. |
| **Native scripts** | `yarn android`, `yarn ios`, `yarn ios:simulator`, `yarn android:apk`, `yarn build:dev:android`, `yarn build:dev:ios`. |
| **Splash / blank screen** | Native splash is hidden from `app/index.tsx` so the app doesn’t get stuck on a black screen (whether or not user hits `/splash`). Safety timeout (3s) if storage hangs. |
| **Sign-up / Clerk** | “Password found in data breach” is Clerk’s breached-password check. Use a different password or disable “Reject compromised passwords” in Clerk Dashboard for dev. Documented in `mobile/docs/ENV_SETUP.md`. |
| **ADB (Android)** | `yarn android` must run in a **system terminal** (e.g. Terminal.app), not Cursor’s terminal, or ADB can fail. Doc in root `docs/README.md`. |

---

## 2. Recommended workflow

### First-time / rebuild native

1. **From project root:** start backend (and DB) if the app needs the API.
2. **Mobile:**  
   `cd mobile` → `yarn install` → ensure `.env` has `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_API_URL`.
3. **Dev build on device/simulator:**  
   - **Android:** In Terminal.app: `cd mobile` then `yarn android` (builds and installs; use `yarn android:apk` if you only want the APK).  
   - **iOS:** `cd mobile` then `yarn ios` (simulator) or `yarn ios:simulator` (device picker).
4. **Start Metro:**  
   `cd mobile` → `yarn start`. App (dev build) will connect to this bundler.

### Daily dev

1. Start backend if needed.
2. In one terminal: `cd mobile && yarn start`.
3. On device/simulator: open the **dev build** (not Expo Go). App loads from Metro.
4. For native changes: run `yarn android` or `yarn ios` again from a system terminal (Android) or same machine (iOS).

### EAS dev builds (no local Android SDK)

- **Android APK:** `yarn build:dev:android` → download from EAS and install.  
- **iOS:** `yarn build:dev:ios` → install on simulator/device per EAS instructions.

---

## 3. Script reference (`mobile/package.json`)

| Script | Purpose |
|--------|--------|
| `yarn start` | Metro for **dev build** (default). |
| `yarn start:go` | Metro for **Expo Go**. |
| `yarn android` | Build + install on Android device/emulator (run in system terminal). |
| `yarn android:apk` | Build debug APK only; output under `android/app/build/outputs/apk/debug/`. |
| `yarn ios` | Build + run on iOS simulator. |
| `yarn ios:simulator` | Build + run with device/simulator picker. |
| `yarn build:dev:android` | EAS development build (Android APK). |
| `yarn build:dev:ios` | EAS development build (iOS). |
| `yarn build:android` / `yarn build:ios` | EAS production builds. |

---

## 4. Optional next steps

- **Testing:** Add a minimal Jest or Detox setup for auth and critical flows.  
- **CI:** Run `yarn android:apk` or EAS build on push/PR for the mobile app.  
- **Env checks:** Fail fast in dev if `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` or API URL is missing.  
- **Error handling:** On sign-up, detect Clerk “breached password” error and show a short in-app hint (e.g. “Use a password you don’t use elsewhere”).

---

## 5. Doc map

- **Root:** `docs/README.md` — full project + Docker, backend, frontend, **mobile (Android/iOS, ADB, EAS)**.  
- **Mobile env:** `mobile/docs/ENV_SETUP.md` — env vars, Clerk, breached-password note.  
- **Mobile build:** `mobile/docs/BUILD_INSTRUCTIONS.md` — build details if present.  
- **This file:** `mobile/docs/DEV_PLAN.md` — plan and workflow summary.
