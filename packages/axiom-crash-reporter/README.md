# Axiom Crash Reporter

A simple, lightweight crash reporter for React Native and web that sends crash data to [Axiom](https://axiom.co) instead of traditional crash reporting services.

## Features

- 🚨 **Catches both JS and Native crashes** (with some limitations on native)
- 🌐 **Works on React Native AND Web** (with platform-specific handlers)
- 🎯 **Unique crash IDs** displayed to users for easy support tracking
- 📍 **Navigation history tracking** to understand user journey
- 🌐 **API request/response logging** (optional)
- 🎨 **Customizable fallback UI**
- 📊 **Rich crash metadata** (device info, app metadata, timestamps)
- ⚡ **Powered by Axiom** for powerful querying and analysis

## Installation

```bash
npm install @akari/axiom-crash-reporter
```

Or with yarn:

```bash
yarn add @akari/axiom-crash-reporter
```

## Setup

### 1. Get your Axiom credentials

- Sign up at [axiom.co](https://axiom.co)
- Create a dataset (e.g., `react-native-crashes`)
- Generate an API token from your settings

### 2. Wrap your app with CrashProvider

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { CrashProvider } from '@akari/axiom-crash-reporter';

export const navigationRef = React.createRef<any>();

function App() {
  return (
  <CrashProvider
      axiomConfig={{
        token: 'YOUR_AXIOM_API_TOKEN',
        dataset: 'react-native-crashes',
      }}
      navigationRef={navigationRef}
    >
      <NavigationContainer ref={navigationRef}>
        {/* Your app */}
      </NavigationContainer>
    </CrashProvider>
  );
}

export default App;
```

## Configuration Options

```tsx
type CrashProviderProps = {
  axiomConfig: {
    token: string;           // Required: Your Axiom API token
    orgId?: string;          // Optional: Your organization ID
    dataset?: string;        // Optional: Dataset name (default: 'react-native-crashes')
  };
  navigationRef?: any;       // Optional: React Navigation ref for tracking routes
  getApiHistory?: () => any[]; // Optional: Function to get API request history
  appMetadata?: Record<string, any>; // Optional: Additional app metadata
  onCrash?: (crashData: CrashData) => void; // Optional: Callback when crash occurs
  CustomFallbackComponent?: React.ComponentType<FallbackComponentProps>; // Optional: Custom error screen
  enableConsoleLogging?: boolean; // Optional: Enable debug logs (default: false)
};
```

## Advanced Usage

### With API Request Logging

```tsx
import { getRequests } from 'react-native-network-logger';

<CrashProvider
  axiomConfig={{ token: 'YOUR_TOKEN' }}
  getApiHistory={() => getRequests()}
>
  {/* Your app */}
</CrashProvider>
```

### With Custom Metadata

```tsx
<CrashProvider
  axiomConfig={{ token: 'YOUR_TOKEN' }}
  appMetadata={{
    version: '1.0.0',
    environment: 'production',
    userId: currentUser?.id,
  }}
>
  {/* Your app */}
</CrashProvider>
```

### With Custom Fallback Component

```tsx
import { FallbackComponentProps } from '@akari/axiom-crash-reporter';

const MyCustomErrorScreen: React.FC<FallbackComponentProps> = ({ 
  error, 
  crashId, 
  onReset 
}) => {
  return (
    <View>
      <Text>Error Code: {crashId}</Text>
      <Button title="Restart" onPress={onReset} />
    </View>
  );
};

  <CrashProvider
  axiomConfig={{ token: 'YOUR_TOKEN' }}
  CustomFallbackComponent={MyCustomErrorScreen}
>
  {/* Your app */}
</CrashProvider>
```

### With Crash Callback

```tsx
<CrashProvider
  axiomConfig={{ token: 'YOUR_TOKEN' }}
  onCrash={(crashData) => {
    console.log('Crash occurred:', crashData.crashId);
  }}
>
  {/* Your app */}
</CrashProvider>
```

## What Gets Sent to Axiom?

Each crash report includes:

```typescript
{
  crashId: string;
  timestamp: string;
  error: {
    message: string;
    stack: string;
    name: string;
  };
  isFatal: boolean;
  type: string;
  navigation?: {
    currentRoute: any;
    routeHistory: any;
  };
  apiHistory?: any[];
  device: {
    platform: string;
    os: string;
  };
  appMetadata?: object;
  userAgent?: string;
}
```

## Querying Crashes in Axiom

```apl
['react-native-crashes']
| where isFatal == true
| summarize count() by error.message
```

```apl
['react-native-crashes']
| where crashId == "ABC123"
```

## Limitations

- **Native crash handling** is not perfect; some native crashes might be missed.
- **Web support** relies on `error` and `unhandledrejection` global events.
- **Requires network** connectivity to send crash reports to Axiom.

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Credits

Inspired by [this article](https://medium.com/@myzorrrr/the-efficient-way-to-deal-with-react-native-crashes-c0782e81320f).
