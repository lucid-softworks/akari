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

## API and Data Fetching Patterns

**CRITICAL**: Always use React Query hooks for API calls and data fetching. Never use raw `fetch` calls or direct API client calls in components.

### Why use hooks for API calls?

1. **Consistency**: All data fetching follows the same pattern across the app
2. **Caching**: React Query provides automatic caching and background updates
3. **Loading States**: Built-in loading, error, and success states
4. **Optimistic Updates**: Easy to implement optimistic updates and cache invalidation
5. **Type Safety**: Full TypeScript support with proper typing

### Hook Patterns:

#### Query Hooks (for fetching data):

```typescript
// ✅ Correct - Query hook pattern
export function useProfile(identifier: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['profile', identifier, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getProfile(token, identifier);
    },
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

#### Mutation Hooks (for data changes):

```typescript
// ✅ Correct - Mutation hook pattern
export function useAddHandleToHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['addHandleToHistory'],
    mutationFn: async ({ did, handle }: { did: string; handle: string }) => {
      await addHandleToHistory(did, handle);
    },
    onSuccess: (_, { did }) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['handleHistory', did] });
    },
  });
}
```

#### Component Usage:

```typescript
// ✅ Correct - Using hooks in components
export function ProfileComponent({ handle }: { handle: string }) {
  const { data: profile, isLoading, error } = useProfile(handle);
  const addHandleMutation = useAddHandleToHistory();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  if (!profile) return <NotFound />;

  return <ProfileView profile={profile} />;
}
```

### ❌ **Incorrect Patterns**:

```typescript
// ❌ Never do this - Direct API calls in components
export function ProfileComponent({ handle }: { handle: string }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/profile/${handle}`);
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [handle]);

  // ... rest of component
}
```

```typescript
// ❌ Never do this - Direct API client calls in components
export function ProfileComponent({ handle }: { handle: string }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const api = new BlueskyApi();
    api.getProfile(handle).then(setProfile);
  }, [handle]);

  // ... rest of component
}
```

### Hook Guidelines:

1. **Query Hooks**: Use for fetching/reading data

   - Place in `apps/akari/hooks/queries/` directory
   - Follow naming pattern: `use[EntityName]` (e.g., `useProfile`, `useTimeline`)
   - **Always include `queryKey`** for proper React Query tracking
   - Always include proper error handling and loading states
   - Use appropriate `staleTime` and `cacheTime` for the data type

2. **Mutation Hooks**: Use for creating/updating/deleting data

   - Place in `apps/akari/hooks/mutations/` directory
   - Follow naming pattern: `use[Action][EntityName]` (e.g., `useUpdateProfile`, `useDeletePost`)
   - **Always include `mutationKey`** for proper React Query tracking
   - Always invalidate related queries on success
   - Include optimistic updates where appropriate

3. **Custom Hooks**: Use for complex logic that combines multiple hooks
   - Place in `apps/akari/hooks/` directory
   - Follow naming pattern: `use[FeatureName]` (e.g., `useHandleHistory`)
   - Can combine queries, mutations, and local state

### File Organization:

```
apps/akari/hooks/
├── queries/           # Data fetching hooks
│   ├── useProfile.ts
│   ├── useTimeline.ts
│   └── useHandleHistory.ts
├── mutations/         # Data modification hooks
│   ├── useUpdateProfile.ts
│   ├── useFollowUser.ts
│   └── useAddHandleToHistory.ts
└── useHandleHistory.ts # Custom composite hooks
```

This pattern ensures consistent, maintainable, and performant data fetching across the entire application.

## TypeScript Type Safety

**CRITICAL**: Never use `any` type assertions. Always use proper TypeScript types.

### Why avoid `any`?

1. **Type Safety**: `any` defeats the purpose of TypeScript's type checking
2. **Maintainability**: Code with `any` is harder to maintain and debug
3. **IDE Support**: Loss of autocomplete, refactoring, and error detection
4. **Runtime Errors**: `any` can lead to runtime errors that TypeScript should catch

### ❌ **Incorrect**:

```typescript
// Never do this - using any type assertions
const data = (response as any).nested.property;
const record = (embed.record as any).record?.record;
```

### ✅ **Correct**:

```typescript
// Use proper type definitions
type NestedResponse = {
  nested: {
    property: string;
  };
};

const data = (response as NestedResponse).nested.property;

// Or use type guards
function isNestedResponse(obj: unknown): obj is NestedResponse {
  return typeof obj === 'object' && obj !== null && 'nested' in obj;
}

if (isNestedResponse(response)) {
  const data = response.nested.property;
}
```

### When you encounter complex nested types:

1. **Define proper types** for the data structures you're working with
2. **Use type guards** to safely check types at runtime
3. **Use optional chaining** with proper type definitions
4. **Create utility types** for complex nested structures

This ensures type safety while maintaining code readability and maintainability.

## Testing Guidelines

**CRITICAL**: Always use `npm run test:run` or `npm run test:coverage` instead of `npm test` to avoid Jest hanging in interactive/watch mode.

**CRITICAL**: This project uses Jest with jest-expo preset for testing. Use Jest's built-in functions like `jest.useFakeTimers()` instead of vitest equivalents.

### Why proper imports matter?

1. **Type Safety**: Missing imports cause TypeScript errors
2. **Consistency**: All test files should follow the same import pattern
3. **Maintainability**: Clear imports make tests easier to understand and maintain

### ✅ **Correct Import Pattern**:

```typescript
import { render } from '@testing-library/react-native';

import { ComponentName } from './ComponentName';
```

### ❌ **Incorrect**:

```typescript
// Don't import Jest globals - they're available globally
import { describe, expect, it, jest } from 'jest';
```

### Testing Best Practices:

1. **Jest globals are available** - no need to import describe, it, expect, jest, beforeEach, afterEach
2. **Mock external dependencies** properly using jest.mock()
3. **Use beforeEach** to reset mocks and setup test state
4. **Test all props and behaviors** comprehensively
5. **Include edge cases** and error scenarios
6. **Follow consistent naming** patterns for test descriptions
7. **Use proper TypeScript types** in test files

### Test File Organization:

```
__tests__/
├── components/           # Component tests
│   ├── ComponentName.test.tsx
│   └── AnotherComponent.test.tsx
├── utils/               # Utility function tests
│   └── utilityName.test.ts
└── hooks/               # Hook tests (when needed)
    └── hookName.test.ts

# Main app structure
components/
├── ComponentName.tsx
utils/
├── utilityName.ts
hooks/
├── hookName.ts
```

**Import Pattern**: Always use `@/` alias for imports in test files:

```typescript
import { ComponentName } from '@/components/ComponentName';
import { utilityFunction } from '@/utils/utilityName';
```

This ensures all tests are properly typed and follow consistent patterns across the project.
