# Firehose Notifier

The Firehose Notifier is a lightweight Node.js service that listens to the AT Protocol Jetstream firehose and emits Expo push notifications when other users interact with posts owned by registered Akari users. It supports follows, likes, reposts, and replies. Subscriptions are sourced from the companion registry service in `apps/notifier-registry`.

## Configuration

The service reads configuration from environment variables. In production it should point at the subscription registry so every Akari user with a registered device receives notifications automatically.

### Subscription registry

- `AKARI_NOTIFIER_REGISTRY_URL` – HTTPS endpoint that returns a JSON array of `{ "did": string, "tokens": string[] }` objects.
- `AKARI_NOTIFIER_REGISTRY_TOKEN` – Optional bearer token used to authenticate with the registry.
- `AKARI_NOTIFIER_REGISTRY_REFRESH_MS` – Optional polling interval (milliseconds) for refreshing registry data (defaults to 5 minutes, minimum 30 seconds).

### Optional configuration

- `AKARI_EXPO_ACCESS_TOKEN` – Server access token for the Expo Push service.
- `AKARI_NOTIFIER_LOG_LEVEL` – Set to `debug`, `info`, `warn`, or `error` (defaults to `info`).

## Scripts

```bash
# Install dependencies
npm install

# Build the service
npm run build -- --filter=firehose-notifier

# Start in watch mode
turbo run dev --filter=firehose-notifier

# Run the compiled service
npm run start -- --filter=firehose-notifier
```

## Behaviour

The notifier watches the Jetstream firehose for:

- `app.bsky.graph.follow` – Alerts when someone follows a monitored DID.
- `app.bsky.feed.like` – Alerts when someone likes a post owned by a monitored DID.
- `app.bsky.feed.repost` – Alerts when someone reposts a monitored DID's post.
- `app.bsky.feed.post` – Alerts when someone replies to a monitored DID's post.

Each notification includes metadata suitable for deep linking (interaction reason, actor DID, and relevant URIs).
