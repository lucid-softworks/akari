# Bluesky API Modular Structure

This directory contains a modular implementation of the Bluesky API client, split into focused modules for better maintainability and extensibility.

## Structure

- **`types.ts`** - All TypeScript type definitions
- **`client.ts`** - Base API client with HTTP request handling
- **`auth.ts`** - Authentication methods (createSession, refreshSession)
- **`feeds.ts`** - Feed-related methods (timeline, posts, profiles)
- **`search.ts`** - Search methods (profiles, posts)
- **`api.ts`** - Main API class that combines all modules

## Usage

### Basic Usage (Recommended)

```typescript
import { blueskyApi } from "../utils/blueskyApi";

// Use the default instance
const session = await blueskyApi.createSession("username", "password");
const timeline = await blueskyApi.getTimeline(session.accessJwt);
```

### Advanced Usage (Custom PDS)

```typescript
import { BlueskyApi } from "../utils/blueskyApi";

// Create custom instance with different PDS
const customApi = BlueskyApi.createWithPDS("https://custom.pds.com/xrpc");
const session = await customApi.createSession("username", "password");
```

### Individual Modules

```typescript
import { BlueskyAuth, BlueskyFeeds, BlueskySearch } from "../utils/blueskyApi";

// Use individual modules
const auth = new BlueskyAuth();
const feeds = new BlueskyFeeds();
const search = new BlueskySearch();

const session = await auth.createSession("username", "password");
const timeline = await feeds.getTimeline(session.accessJwt);
const results = await search.searchProfiles(session.accessJwt, "query");
```

## Adding New Methods

To add new API methods:

1. **For authentication methods**: Add to `auth.ts`
2. **For feed/post methods**: Add to `feeds.ts`
3. **For search methods**: Add to `search.ts`
4. **For new categories**: Create a new module (e.g., `notifications.ts`)

Then update `api.ts` to include the new methods in the main class.

## Benefits

- **Modularity**: Each module has a single responsibility
- **Maintainability**: Easier to find and modify specific functionality
- **Extensibility**: Simple to add new methods without touching existing code
- **Type Safety**: All types are centralized in `types.ts`
- **Backward Compatibility**: The main `blueskyApi.ts` file maintains the same API
