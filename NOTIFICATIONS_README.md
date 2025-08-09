# Notifications System - Akari v2

This document explains how to use the notifications system implemented in Akari v2 using Expo Notifications.

## Features

- **Push Notifications**: Receive notifications when the app is closed or in the background
- **Local Notifications**: Send notifications from within the app
- **Permission Management**: Handle notification permissions gracefully
- **Badge Management**: Show unread notification count on app icon
- **Deep Linking**: Navigate to specific screens when notifications are tapped
- **Android Channels**: Proper notification channels for Android devices
- **Test Notifications**: Test the notification system with sample notifications

## Setup

### 1. Dependencies

The following packages are already installed:

- `expo-notifications` - Core notifications functionality
- `expo-device` - Device detection for permissions
- `expo-constants` - Project configuration access

### 2. Configuration

The app.json has been configured with:

- Expo Notifications plugin
- Custom notification icon and color
- Custom notification sounds (optional)

### 3. Project ID

Make sure your EAS project ID is configured in `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "your-project-id-here"
  }
}
```

## Usage

### Basic Setup

The notifications system is automatically initialized in `app/_layout.tsx` using the `usePushNotifications` hook.

### Requesting Permissions

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { requestPermissions, permissionStatus } = usePushNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestPermissions();
    if (granted) {
      console.log('Notifications enabled!');
    }
  };
}
```

### Sending Local Notifications

```typescript
import { scheduleLocalNotification } from '@/utils/notifications';

// Send immediate notification
await scheduleLocalNotification('Title', 'Message body', { customData: 'value' });

// Schedule delayed notification
await scheduleLocalNotification(
  'Delayed Title',
  'Delayed message',
  { customData: 'value' },
  {
    type: 'timeInterval',
    seconds: 60, // 1 minute delay
  },
);
```

### Handling Notification Responses

The system automatically handles notification taps and navigates to appropriate screens based on the notification data:

```typescript
// Notification data structure for deep linking
{
  type: 'post',      // Navigate to post
  id: 'post-uri'     // Post identifier
}

{
  type: 'profile',   // Navigate to profile
  id: 'handle'       // User handle
}

{
  type: 'conversation', // Navigate to messages
  id: 'conversation-id'
}
```

## Components

### NotificationSettings

Located in `components/NotificationSettings.tsx`, this component provides:

- Permission status display
- Enable/disable toggle
- Sound, vibration, and badge preferences
- Badge clearing functionality
- Test notification buttons

### NotificationTest

Located in `components/NotificationTest.tsx`, this component allows users to:

- Send immediate test notifications
- Schedule delayed test notifications
- Verify notification functionality

## Hooks

### usePushNotifications

Main hook for managing push notifications:

```typescript
const {
  expoPushToken, // Expo push token for server communication
  devicePushToken, // Native device token (Android only)
  permissionStatus, // Current permission status
  isLoading, // Loading state
  error, // Error message
  requestPermissions, // Request notification permissions
  register, // Register for push notifications
  initialize, // Initialize the entire system
  clearBadge, // Clear app badge
} = usePushNotifications();
```

## Android Notification Channels

The system automatically creates the following notification channels:

- **Default**: General notifications
- **High Priority**: Important notifications with sound and vibration
- **Messages**: Direct messages and replies
- **Mentions**: When someone mentions you
- **Likes & Reposts**: Social interactions
- **Follows**: New followers

## Testing

### Development

1. Use the test buttons in the notification settings
2. Check console logs for notification events
3. Test on physical devices (notifications don't work in simulators)

### Production

1. Send push notifications using your Expo push token
2. Test deep linking by tapping notifications
3. Verify badge counts update correctly

## Troubleshooting

### Common Issues

1. **Notifications not showing**: Check permission status and device settings
2. **Badge not updating**: Ensure badge permissions are granted
3. **Deep linking not working**: Verify notification data structure
4. **Android channels missing**: Check if channels are created on app startup

### Debug Information

In development mode, the notification settings show:

- Current permission status
- Expo push token
- Error messages
- Loading states

## Server Integration

To send push notifications from your server:

1. Store the `expoPushToken` when users enable notifications
2. Use the Expo Push API to send notifications
3. Include proper data for deep linking
4. Handle notification responses appropriately

Example server request:

```bash
curl -H "Content-Type: application/json" \
     -X POST "https://exp.host/--/api/v2/push/send" \
     -d '{
       "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
       "title": "New notification",
       "body": "You have a new notification",
       "data": { "type": "post", "id": "post-uri" }
     }'
```

## Security Considerations

- Never expose push tokens in client-side code
- Validate notification data on the server
- Implement proper authentication for push notification requests
- Handle sensitive data appropriately in notification payloads

## Future Enhancements

- Custom notification sounds
- Rich notifications with images
- Notification categories and actions
- Background notification processing
- Notification history and management
