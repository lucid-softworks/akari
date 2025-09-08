# ClearSky API Client

A TypeScript client for the ClearSky API services, providing access to Bluesky moderation data and analytics.

## Features

- **Anonymous Endpoints**: Access to all public ClearSky API endpoints
- **TypeScript Support**: Fully typed API responses and requests
- **Modular Design**: Clean separation of concerns with dedicated classes for different API sections
- **Error Handling**: Comprehensive error handling with typed error responses
- **Pagination Support**: Built-in pagination for list endpoints

## Installation

```bash
npm install clearsky-api
```

## Usage

### Basic Setup

```typescript
import { ClearSkyApi } from 'clearsky-api';

// Create a client instance
const client = new ClearSkyApi();

// Or with custom base URL
const client = new ClearSkyApi('https://api.clearsky.services');
```

### Getting User Information

```typescript
// Get DID from handle
const didResponse = await client.getDid('example.bsky.social');
console.log(didResponse.data.did_identifier);

// Get handle from DID
const handleResponse = await client.getHandle('did:plc:example');
console.log(handleResponse.data.handle_identifier);

// Get user profile
const profile = await client.getProfile('example.bsky.social');
console.log(profile.data.handle);
```

### Moderation Lists

```typescript
// Get lists a user is on
const lists = await client.getList('example.bsky.social');
console.log(lists.data.lists);

// Get total count of lists
const total = await client.getListTotal('example.bsky.social');
console.log(total.data.count);

// Search for moderation lists
const searchResults = await client.searchModerationLists('spam');
console.log(searchResults.data.lists);
```

### Block Statistics

```typescript
// Get top block statistics
const topBlockStats = await client.getTopBlockStats();
console.log(topBlockStats.data.blockers);

// Get 24-hour block statistics
const blockStats24Hour = await client.getTopBlockStats24Hour();
console.log(blockStats24Hour.data.blocked);

// Get comprehensive block statistics
const blockStats = await client.getBlockStats();
console.log(blockStats.data.totalUsers);
```

### Pagination

Most list endpoints support pagination:

```typescript
// Get first page
const firstPage = await client.getBlocklist('example.bsky.social');

// Get second page
const secondPage = await client.getBlocklist('example.bsky.social', { page: 2 });
```

### Error Handling

```typescript
try {
  const profile = await client.getProfile('invalid-handle');
} catch (error) {
  console.error('API Error:', error.message);
}
```

## API Endpoints

The client provides access to all anonymous ClearSky API endpoints:

### User Information

- `getDid(handle)` - Get DID from handle
- `getHandle(did)` - Get handle from DID
- `getProfile(identifier)` - Get user profile
- `getHandleHistory(identifier)` - Get account history
- `getPlacement(identifier)` - Get join order

### Moderation Lists

- `getList(identifier, options?)` - Get lists user is on
- `getListTotal(identifier)` - Get total list count
- `searchModerationLists(name, options?)` - Search lists

### Blocking Data

- `getBlocklist(identifier, options?)` - Get lists user is blocking
- `getSingleBlocklist(identifier, options?)` - Get lists user is blocked on
- `getBlocklistTotal(identifier)` - Get total blocking count
- `getSingleBlocklistTotal(identifier)` - Get total blocked count

### Statistics

- `getTotalUsers()` - Get user count statistics
- `getTopBlockStats()` - Get top blockers/blocked
- `getTopBlockStats24Hour()` - Get 24-hour stats
- `getBlockStats()` - Get comprehensive statistics
- `getDidsPerPds()` - Get PDS distribution

### Starter Packs

- `getStarterPacks(identifier, options?)` - Get user's starter packs
- `getStarterPacksTotal(identifier)` - Get total count
- `getSingleStarterPack(identifier, options?)` - Get packs user is on
- `getSingleStarterPackTotal(identifier)` - Get total count

### Utilities

- `validateHandle(handle)` - Validate handle format
- `getUriUrl(uri)` - Resolve URI to URL
- `getTimeBehind()` - Get data freshness status
- `getLabelers(options?)` - Get active labelers
- `getLogo()` - Get ClearSky logo image

## TypeScript Support

All API responses are fully typed. Import types as needed:

```typescript
import type { ClearSkyProfile, ClearSkyBlockStatsResponse, ClearSkyModerationListItem } from 'clearsky-api';
```

## Rate Limiting

The ClearSky API has the following rate limits:

- **Anonymous endpoints**: 5 requests per second
- **Authenticated endpoints**: 30 requests per second

The client does not implement rate limiting - implement your own throttling if needed.

## Error Responses

All errors follow the `ClearSkyError` type:

```typescript
type ClearSkyError = {
  error: string;
  message: string;
  status?: number;
};
```

Common HTTP status codes:

- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `423` - Locked
- `429` - Too Many Requests
- `500` - Internal Server Error
- `501` - Not Implemented
- `503` - Service Unavailable

## License

MIT
