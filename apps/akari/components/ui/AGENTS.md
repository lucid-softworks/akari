# UI Primitives Guidelines

- Components in this folder are foundational building blocks. Keep them stateless (aside from internal animation state) and reusable.
- `Panel` and other surface components must retain square corners—do not add `borderRadius`. Preserve the hairline borders and neutral background colours already configured.
- The `Skeleton` component drives shimmer animations with an `Animated.Value`. When extending it, keep the animation loop intact and expose width/height as `DimensionValue`. Theme colours should always come from `useThemeColor`.
- `IconSymbol` is split by platform (`IconSymbol.tsx` and `.ios.tsx`). When adding a new SF Symbol, update the Android/web mapping in `IconSymbol.tsx` and ensure the iOS variant still uses `SymbolView` with configurable weight.
- `VirtualizedList` wraps `@shopify/flash-list`. Prefer adjusting its `estimatedItemSize` or `overscan` props rather than reimplementing virtualization. Keep the default constants unless a use case requires tuning.
- `DialogModal` must remain accessible: the backdrop acts as a button when `onRequestClose` is provided. Do not remove the `Pressable` overlay or its accessibility labels.
- Higher-order utilities like `withSkeleton` should pass `style` and other props through to the wrapped component to avoid layout regressions.
