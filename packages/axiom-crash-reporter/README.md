# Axiom Crash Reporter

`axiom-crash-reporter` provides a lightweight crash reporting helper that forwards runtime errors from JavaScript and React Native apps to [Axiom](https://axiom.co).

## Installation

```bash
npm install axiom-crash-reporter
```

The package depends on the official [`@axiomhq/js`](https://www.npmjs.com/package/@axiomhq/js) SDK which is installed automatically.

## Quick start

```ts
import { initializeAxiomCrashReporter } from 'axiom-crash-reporter';

const reporter = initializeAxiomCrashReporter({
  token: process.env.AXIOM_TOKEN!,
  dataset: 'app-crashes',
  environment: 'production',
  appVersion: '1.0.0',
});

// Manually capture handled errors
try {
  doSomething();
} catch (error) {
  await reporter.reportError(error, { metadata: { action: 'doSomething' } });
}
```

`initializeAxiomCrashReporter` installs global handlers that capture uncaught errors and promise rejections. Use the exported `AxiomCrashReporter` class for fine-grained control or to integrate with existing error handling.

## API

### `initializeAxiomCrashReporter(options)`

Creates an `AxiomCrashReporter` instance and registers global handlers immediately. Returns the configured reporter instance.

### `AxiomCrashReporter`

The class exposes the following methods:

- `install()` / `uninstall()` – register or remove global handlers.
- `reportError(error, context?)` – normalize and forward an error to Axiom.
- `reportFatalError(error, context?)` – helper that marks the payload as fatal.
- `captureException(error, context?)` – alias for `reportError`.

The `context` argument accepts optional metadata, tags, severity overrides, and fatal flags.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `dataset` | `string` | **Required.** Axiom dataset name. |
| `token` | `string` | Ingestion token used to create an Axiom client. Provide either `token` or `client`. |
| `client` | `Axiom` | Optional pre-configured Axiom client instance. |
| `environment` | `string` | Environment label such as `production` or `development`. |
| `appVersion` | `string` | Application version attached to each crash report. |
| `releaseChannel` | `string` | Release channel or build flavor identifier. |
| `applicationId` | `string` | Optional application identifier to aid multi-app deployments. |
| `metadata` | `Record<string, unknown>` | Default metadata merged into every report. |
| `flushOnCapture` | `boolean` | Flush the Axiom client after each report (default `true`). |
| `beforeSend` | `(report) => report \| null` | Transform or drop payloads before they are ingested. |
| `onError` | `(error) => void` | Error handler invoked when ingestion fails. |

## Testing

```
npm run test --workspace axiom-crash-reporter
```

## License

MIT
