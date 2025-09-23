# LibreTranslate API Package Guidelines

- Use `sanitizeLibreTranslateEndpoint` and `withApiKey` when constructing clients—`LibreTranslateClient` already normalises trailing slashes and injects the API key when present.
- Keep JSON parsing defensive. Reuse helpers like `safeParseJson` and `getErrorMessage` so the client returns structured error objects instead of throwing unexpectedly.
- Maintain `DEFAULT_LIBRETRANSLATE_LANGUAGES` sorted by language code. Update it when LibreTranslate exposes new languages.
- Expose convenience factories (e.g., `createLibreTranslateClient`) for the app. Ensure new exports are added at the bottom of `src/index.ts`.
- Add tests for new behaviours using `msw` to emulate LibreTranslate responses, including partial or malformed payloads.
