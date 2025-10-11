# Teal API Package Guidelines

- Extend `TealApi` with additional helpers when new Teal feed collections are required instead of scattering raw `makeRequest` calls.
- Define record payload shapes in `types.ts` and re-export them from `src/index.ts`.
- Cover both success and empty states with Jest tests using `msw` handlers before exposing new methods.
