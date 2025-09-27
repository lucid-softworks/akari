# Akari Monorepo

Akari is an open-source AT Protocol client that puts Bluesky-friendly social features into a single cross-platform app. This repository is the home for the mobile experience, supporting tooling, and documentation that power the project.

## Meet Akari

- **Open social made simple** – Sign in with your Bluesky handle today, and grow with the wider AT Protocol ecosystem tomorrow.
- **Focused on expression** – Rich media previews, GIF reactions, and thoughtful composer helpers keep conversations vibrant.
- **Privacy-minded by design** – Sessions are encrypted with `react-native-mmkv` so your accounts stay protected on shared devices.

Akari is actively developed by volunteers. We are building toward public releases on the iOS App Store and Google Play while shipping community preview builds along the way.

## Follow the journey

- Track updates and share feedback on Bluesky: [@akari.blue](https://bsky.app/profile/akari.blue).
- Watch this repository for release notes and roadmap issues.
- Review the [Code of Conduct](CODE_OF_CONDUCT.md) to understand how we collaborate.

## Try Akari today

Curious explorers can run the latest preview with the Expo toolchain. No production account changes are required—log in with your existing Bluesky credentials.

1. **Set up your workstation**
   - Install Node.js 22 (ships with npm 10) and Git.
   - Install Xcode (for iOS) and/or Android Studio (for Android) so you can build a development client.
   - Optional: install platform CLIs (e.g., `ios-deploy`, `adb`) if you want to target physical devices.
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Build and run the development client**
   - **iOS simulator or device**
     ```bash
     npm run ios:development
     ```
   - **Android emulator or device**
     ```bash
     npm run android:development
     ```
   - **Web preview**
     ```bash
     npm run web:development
     ```
   These commands create a platform-specific dev client (we do not rely on Expo Go) and launch Metro so the app reloads as you edit source files. Once the client is installed you can keep Metro running with:
   ```bash
   npm run start:development
   ```

If you would rather wait for packaged releases, follow the Bluesky account above—we post TestFlight and Android beta links there when they are ready.

## Repository tour

```text
apps/
├─ akari/           # Expo application source
├─ akari-e2e/       # Playwright end-to-end test suite
└─ docs/            # Static documentation site
packages/           # Reusable TypeScript AT Protocol clients and utilities
scripts/            # Tooling (coverage merge, translation helpers, etc.)
```

Each workspace includes its own README with setup and architectural notes. Highlights include:

- [`apps/akari/README.md`](apps/akari/README.md) – app configuration, secure storage guidance, deployment checklist
- [`packages/bluesky-api/README.md`](packages/bluesky-api/README.md) – modular AT Protocol client overview
- [`packages/clearsky-api/README.md`](packages/clearsky-api/README.md) – moderation and analytics client usage
- [`CONTRIBUTING.md`](CONTRIBUTING.md) – onboarding steps for new contributors

## For contributors

The monorepo uses npm workspaces and Turbo. Node.js 22 is required and enforced via `.npmrc` and the `package.json` `engines` field.

```bash
npm run start:development -- --filter=akari    # Launch the Expo app directly
npm run lint -- --filter=akari                # Lint app sources
npm run test                                  # Run unit tests
npm run test:e2e                              # Execute Playwright scenarios
```

Localization files live in `apps/akari/translations`. Use `npm run update-translations` and `npm run validate-translations` to sync copy across locales. Regenerate the static documentation with `node scripts/generate-docs.cjs`, and clear caches with `npm run clean` when builds go stale.

## License

Akari is released under the [MIT License](LICENSE).

---

_Thank you for checking out Akari. Whether you are here to explore the app or contribute code, the docs in this repository will guide your next step._
