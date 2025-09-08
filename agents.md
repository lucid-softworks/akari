# Agent Guidelines

## TypeScript Type Definitions

**CRITICAL**: Always use `type` instead of `interface` for TypeScript definitions unless absolutely necessary.

### Why `type` over `interface`?

1. **Consistency**: The project prefers `type` for all type definitions
2. **Simplicity**: `type` is more straightforward and doesn't have the complexity of interface merging
3. **Explicit**: `type` makes it clear that we're defining a type alias, not a contract that can be extended

### When to use `interface` (rare cases only):

- When you need interface merging/extending capabilities
- When working with existing code that already uses interfaces extensively
- When the TypeScript documentation specifically recommends interfaces for a particular use case

### Examples:

✅ **Correct**:

```typescript
export type UserProfile = {
  id: string;
  name: string;
  email: string;
};
```

❌ **Incorrect**:

```typescript
export interface UserProfile {
  id: string;
  name: string;
  email: string;
}
```

### Code Style Guidelines:

1. Always use `type` for object type definitions
2. Use `type` for union types, intersection types, and mapped types
3. Use `type` for function signatures and method definitions
4. Only use `interface` if there's a specific technical requirement that `type` cannot fulfill
5. Always use `for...of` loops instead of `forEach` for array/object iteration

This preference should be applied consistently across all TypeScript files in the entire project.
