# Tenor API Package Guidelines

- `TenorAPI` methods (`searchGifs`, `getTrendingGifs`, `getGifById`, `downloadGifAsBlob`, `convertGifToAttachedImage`) must include the API key and default query parameters (`media_filter=gif`, `contentfilter=medium`). Preserve the default `limit=20` and optional `pos` behaviour.
- Throw descriptive errors using the HTTP status code and status text when Tenor responds with a non-OK status.
- `convertGifToAttachedImage` should continue selecting the best available media format and append `ww`/`hh` dimensions to the URL so it matches Bluesky uploads. Cover edge cases in tests when formats are missing.
- Tests live in `__tests__/tenor-api.test.ts` and rely on `msw`. Add scenarios for new endpoints or altered behaviour, verifying query strings and pagination handling.
