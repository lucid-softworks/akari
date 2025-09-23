# Skeleton Components Guidelines

- Skeletons should compose the shared `Skeleton` primitive from `components/ui/Skeleton` and mirror the layout of the real component (headers, actions, media blocks, etc.) so spacing stays consistent.
- Keep styling simple: match border widths, paddings, and radii from the live component. Use `useThemeColor` for any dynamic colours (see `PostCardSkeleton`).
- Export every skeleton from `components/skeletons/index.ts` so other modules can import from `@/components/skeletons`.
- Skeleton components must remain pure render functions—avoid side effects or asynchronous logic. The only hooks they should use are theming helpers.
