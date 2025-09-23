# Translations Guidelines

- Locale files follow the structure of `en.json`: top-level `language`, `nativeName`, `flag`, and a nested `translations` object with sections like `common`, `auth`, `navigation`, etc. Maintain this shape for every locale.
- When introducing a new key, add it to **every** locale. Provide real translations—do not copy English text into non-English locales unless the wording is identical in that language, and call out those cases in the PR summary.
- Keep keys grouped and ordered the same way across locales to minimise diff noise. Add new strings to the matching section (`common`, `post`, `notifications`, …) in each file.
- Format JSON with 2-space indentation, double quotes, and a trailing newline. Avoid comments.
- After editing translations, run `npm run validate-translations` to confirm there are no missing keys or malformed files. Use `npm run update-translations` only when you intentionally need to regenerate derived data.
- The Settings screen exposes a "🔍 Check Missing Translations" action that reads from `translationLogger`. Ensure it reports success when you run the app after adding new strings.
- When adding a brand-new locale, fill out `language`, `nativeName`, and `flag` appropriately.
