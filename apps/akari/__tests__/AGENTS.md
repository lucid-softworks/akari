# Testing Guidelines

These rules apply to all tests under `apps/akari/__tests__`.

## Tooling and setup
- Use `@testing-library/react-native` for components/screens and the React Query testing utilities already configured in this repo. Avoid enzyme-style shallow rendering.
- Co-locate tests with their subject folders (`components`, `hooks`, `app`, `utils`) and import helpers from `apps/akari/test-utils` when needed.

## Query priority
1. `getByRole`
2. `getByLabelText`
3. `getByText`
4. `getByPlaceholderText`
5. `getByDisplayValue`
6. `getByTestId` (only when no other semantic query works)

## Mocking standards
- Mock network interactions with [MSW](https://mswjs.io/). Set up handlers via `setupServer`/`setupWorker`, assert on requests inside handlers, and reset them between tests.
- Mock heavy child components (web views, image viewers, embeds) to keep tests focused, but keep lightweight presentational components real.
- When rendering lists backed by FlashList, mock `@shopify/flash-list` with the helper in `apps/akari/test-utils/flash-list` and use `mockScrollToOffset` for scroll assertions.

## Coverage and quality
- When adding or modifying tests in this directory, run `npm run test:coverage` to refresh coverage reports and ensure no regressions slip in.
- Exercise success, error, and loading paths. Use `waitFor` for async assertions and verify that React Query caches are updated/invalidation happens when relevant mutations run.
- Keep assertions accessible: prefer semantic roles and translated labels instead of implementation details.

## Missing translations check
- When tests involve localisation, ensure the `useTranslation` mock returns values for all keys under test. The Settings screen includes a "🔍 Check Missing Translations" control—tests that cover translations should mimic that behaviour by checking for warnings.
