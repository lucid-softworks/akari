# Notifier Registry

The Notifier Registry exposes a simple HTTP API for managing Expo push notification subscriptions. The firehose notifier polls this service to discover which Akari users should receive notifications for follows, likes, reposts, and replies.

## API

All responses are JSON encoded. CORS is enabled for all origins by default so mobile clients can call the registry directly.

### `GET /subscriptions`

Returns an array of `{ "did": string, "tokens": string[] }` objects. When `AKARI_REGISTRY_ADMIN_TOKEN` is set the request must include a matching `Authorization: Bearer <token>` header.

### `POST /subscriptions`

Registers a device for notifications. The request body must include:

- `did` – The DID that should receive notifications.
- `expoPushToken` – The Expo push token for the device.
- `devicePushToken` – Optional platform device token, used for diagnostics.
- `platform` – Client platform string (`ios`, `android`, or `web`).

The registry de-duplicates tokens for a DID automatically.

### `DELETE /subscriptions`

Removes a token for a DID. The request body matches the payload accepted by `POST /subscriptions`.

## Configuration

- `AKARI_REGISTRY_PORT` – Port to listen on (defaults to `3001`).
- `AKARI_REGISTRY_HOST` – Host interface to bind to (defaults to `0.0.0.0`).
- `AKARI_REGISTRY_DATA_FILE` – Optional JSON file used to persist subscriptions across restarts.
- `AKARI_REGISTRY_ADMIN_TOKEN` – Optional bearer token required to read subscriptions.
- `AKARI_REGISTRY_CLIENT_TOKEN` – Optional bearer token required to create or delete subscriptions.
- `AKARI_REGISTRY_LOG_LEVEL` – Optional log level (`debug`, `info`, `warn`, `error`). Defaults to `info`.

## Scripts

```bash
# Install dependencies
npm install

# Build the service
npm run build -- --filter=notifier-registry

# Start in watch mode
npm run dev -- --filter=notifier-registry

# Run the compiled service
npm run start -- --filter=notifier-registry
```
