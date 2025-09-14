# Agent Guidelines

## Pull Request Titles

All pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/) syntax.
Use prefixes such as `feat:`, `fix:`, or `docs:` to concisely describe the change.

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

## Comprehensive Testing Strategy

**CRITICAL**: All tests must be comprehensive, not just surface-level smoke tests. We aim for high code coverage and thorough testing of component behavior, user interactions, and edge cases.

### Testing Coverage Requirements

1. **Minimum Coverage Targets**:

   - **Statements**: 100% coverage
   - **Branches**: 100% coverage
   - **Functions**: 100% coverage
   - **Lines**: 100% coverage

2. **Always Run Coverage**: Use `npm run test:coverage` to identify uncovered code paths and missing test scenarios.

### Comprehensive Test Categories

#### 1. **Component Rendering Tests**

- ✅ Basic rendering without crashing
- ✅ Rendering with all prop combinations
- ✅ Rendering with missing/optional props
- ✅ Rendering with edge case data (empty strings, null values, etc.)
- ✅ Rendering with different theme modes (light/dark)

#### 2. **Props and State Testing**

- ✅ Test all prop types and combinations
- ✅ Test prop validation and error handling
- ✅ Test state changes and updates
- ✅ Test conditional rendering based on props/state
- ✅ Test default prop values

#### 3. **User Interaction Testing**

- ✅ Test all touchable elements (buttons, links, etc.)
- ✅ Test form inputs and validation
- ✅ Test navigation and routing
- ✅ Test modal open/close behavior
- ✅ Test gesture interactions (swipe, long press, etc.)

#### 4. **Hook Integration Testing**

- ✅ Test custom hook usage and return values
- ✅ Test hook error states and loading states
- ✅ Test hook side effects and cleanup
- ✅ Test hook dependencies and re-renders
- ✅ Mock external hook dependencies properly

#### 5. **Data Flow Testing**

- ✅ Test data transformation and formatting
- ✅ Test API data handling and error states
- ✅ Test optimistic updates and rollbacks
- ✅ Test cache invalidation and refetching
- ✅ Test data validation and sanitization

#### 6. **Edge Cases and Error Handling**

- ✅ Test network failures and timeouts
- ✅ Test invalid data formats
- ✅ Test boundary conditions (empty arrays, null objects)
- ✅ Test error boundaries and fallback UI
- ✅ Test accessibility edge cases

### Testing Best Practices

#### **Accessibility-First Testing**

**CRITICAL**: Always test components the way users interact with them. Avoid test IDs unless absolutely necessary.

1. **Use semantic queries** - `getByRole`, `getByLabelText`, `getByText`, `getByPlaceholderText`
2. **Test accessibility** - Ensure screen readers can navigate your components
3. **Minimal mocking** - Only mock what you need to isolate the component under test
4. **Real user interactions** - Test buttons, links, and form inputs as users would use them

#### ✅ **Accessibility-First Test Examples**:

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PostCard } from '@/components/PostCard';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useThemeColor } from '@/hooks/useThemeColor';

// Only mock what's necessary for isolation
jest.mock('@/hooks/mutations/useLikePost');
jest.mock('@/hooks/useThemeColor');

const mockUseLikePost = useLikePost as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('PostCard Component - Comprehensive Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    jest.clearAllMocks();
    mockUseLikePost.mockReturnValue({ mutate: jest.fn() });
    mockUseThemeColor.mockReturnValue('#000000');
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('Rendering Tests', () => {
    it('should render with complete post data', () => {
      const mockPost = {
        id: 'test-1',
        text: 'Hello World',
        author: { handle: 'user.bsky.social', displayName: 'User', avatar: 'avatar.jpg' },
        createdAt: '2024-01-01T00:00:00.000Z',
        likeCount: 5,
        commentCount: 2,
        repostCount: 1,
      };

      const { getByText, getByTestId } = renderWithQueryClient(<PostCard post={mockPost} />);

      expect(getByText('User')).toBeTruthy();
      expect(getByText('@user.bsky.social')).toBeTruthy();
      expect(getByText('Hello World')).toBeTruthy();
      expect(getByText('5')).toBeTruthy(); // like count
    });

    it('should render with minimal post data', () => {
      const minimalPost = {
        id: 'test-2',
        author: { handle: 'minimal.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const { getByText, queryByText } = renderWithQueryClient(<PostCard post={minimalPost} />);

      expect(getByText('@minimal.bsky.social')).toBeTruthy();
      expect(queryByText('Hello World')).toBeNull();
    });

    it('should render with reply context', () => {
      const postWithReply = {
        id: 'test-3',
        text: 'Reply text',
        author: { handle: 'replier.bsky.social', displayName: 'Replier' },
        createdAt: '2024-01-01T00:00:00.000Z',
        replyTo: {
          author: { handle: 'original.bsky.social', displayName: 'Original' },
          text: 'Original post text',
        },
      };

      const { getByText } = renderWithQueryClient(<PostCard post={postWithReply} />);

      expect(getByText('Replying to')).toBeTruthy();
      expect(getByText('@original.bsky.social')).toBeTruthy();
    });
  });

  describe('User Interaction Tests', () => {
    it('should handle like button press', async () => {
      const mockMutate = jest.fn();
      mockUseLikePost.mockReturnValue({ mutate: mockMutate });

      const mockPost = {
        id: 'test-4',
        text: 'Test post',
        author: { handle: 'user.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
        uri: 'at://test/post',
        cid: 'test-cid',
      };

      const { getByTestId } = renderWithQueryClient(<PostCard post={mockPost} />);

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      expect(mockMutate).toHaveBeenCalledWith({
        postUri: 'at://test/post',
        postCid: 'test-cid',
        action: 'like',
      });
    });

    it('should handle unlike when already liked', async () => {
      const mockMutate = jest.fn();
      mockUseLikePost.mockReturnValue({ mutate: mockMutate });

      const likedPost = {
        id: 'test-5',
        text: 'Liked post',
        author: { handle: 'user.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
        uri: 'at://test/post',
        viewer: { like: 'at://test/like' },
      };

      const { getByTestId } = renderWithQueryClient(<PostCard post={likedPost} />);

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      expect(mockMutate).toHaveBeenCalledWith({
        postUri: 'at://test/post',
        likeUri: 'at://test/like',
        action: 'unlike',
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing URI for like action', () => {
      const postWithoutUri = {
        id: 'test-6',
        text: 'No URI post',
        author: { handle: 'user.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
        // No uri or cid
      };

      const { getByTestId } = renderWithQueryClient(<PostCard post={postWithoutUri} />);

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Should not call mutate when URI is missing
      expect(mockUseLikePost().mutate).not.toHaveBeenCalled();
    });

    it('should handle empty text gracefully', () => {
      const postWithoutText = {
        id: 'test-7',
        author: { handle: 'user.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      const { getByText } = renderWithQueryClient(<PostCard post={postWithoutText} />);

      expect(getByText('@user.bsky.social')).toBeTruthy();
      // Should not crash with empty text
    });
  });

  describe('Theme and Styling Tests', () => {
    it('should use correct theme colors', () => {
      mockUseThemeColor.mockReturnValue('#ff0000');

      const mockPost = {
        id: 'test-8',
        text: 'Theme test',
        author: { handle: 'user.bsky.social' },
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      renderWithQueryClient(<PostCard post={mockPost} />);

      expect(mockUseThemeColor).toHaveBeenCalledWith(
        expect.objectContaining({
          light: expect.any(String),
          dark: expect.any(String),
        }),
        'background',
      );
    });
  });
});
```

#### ✅ **Comprehensive Hook Test**:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useLikePost } from '@/hooks/mutations/useLikePost';

describe('useLikePost Hook - Comprehensive Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should handle successful like mutation', async () => {
    const { result } = renderHook(() => useLikePost(), { wrapper });

    const likeData = {
      postUri: 'at://test/post',
      postCid: 'test-cid',
      action: 'like' as const,
    };

    result.current.mutate(likeData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle mutation error', async () => {
    // Mock API to return error
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLikePost(), { wrapper });

    const likeData = {
      postUri: 'invalid-uri',
      postCid: 'test-cid',
      action: 'like' as const,
    };

    result.current.mutate(likeData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Accessibility Testing Guidelines

#### **Query Priority (in order of preference)**:

1. **`getByRole`** - Most accessible, tests actual user interactions

   ```typescript
   const button = getByRole('button', { name: /like post/i });
   const link = getByRole('link', { name: /view profile/i });
   ```

2. **`getByLabelText`** - For form inputs and labeled elements

   ```typescript
   const input = getByLabelText(/search/i);
   const checkbox = getByLabelText(/notifications/i);
   ```

3. **`getByText`** - For visible text content

   ```typescript
   const heading = getByText('Welcome to Akari');
   const errorMessage = getByText(/invalid email/i);
   ```

4. **`getByPlaceholderText`** - For inputs with placeholders

   ```typescript
   const searchInput = getByPlaceholderText(/search posts/i);
   ```

5. **`getByDisplayValue`** - For inputs with values

   ```typescript
   const emailInput = getByDisplayValue('user@example.com');
   ```

6. **`getByTestId`** - **LAST RESORT ONLY** - When no other query works
   ```typescript
   // Only use when component has no accessible attributes
   const complexChart = getByTestId('analytics-chart');
   ```

#### **When to Mock vs. When Not to Mock**:

✅ **DO Mock**:

- External API calls and network requests
- Complex child components that aren't the focus of the test
- Hooks that have side effects (navigation, storage, etc.)
- Time-dependent functions (timers, dates)

❌ **DON'T Mock**:

- Simple presentational components
- Utility functions that are pure
- Components you're testing integration with
- Theme/styling logic (unless testing theme switching)

### Test Quality Checklist

Before considering a test complete, ensure:

- [ ] **All code paths are tested** (check coverage report)
- [ ] **All props and their combinations are tested**
- [ ] **All user interactions are tested with semantic queries**
- [ ] **Error states and edge cases are covered**
- [ ] **Only necessary dependencies are mocked**
- [ ] **Theme variations are tested**
- [ ] **Accessibility is tested with screen reader queries**
- [ ] **Performance edge cases are covered**
- [ ] **Integration with parent/child components is tested**
- [ ] **Data transformation logic is verified**

### Coverage Monitoring

1. **Always run `npm run test:coverage`** before committing tests
2. **Aim for 100% coverage** across all metrics
3. **Identify uncovered lines** and write tests for them
4. **Focus on critical business logic** first
5. **Don't sacrifice quality for quantity** - better to have fewer, comprehensive tests

This comprehensive testing strategy ensures robust, maintainable code with high confidence in component behavior and user interactions.
