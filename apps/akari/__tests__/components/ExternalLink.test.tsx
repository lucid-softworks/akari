import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { ExternalLink } from '@/components/ExternalLink';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Link: ({ children, ...props }: { children: React.ReactNode }) => (
      <Text accessibilityRole="link" {...props}>
        {children}
      </Text>
    ),
  };
});

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

const originalPlatform = Platform.OS;

afterEach(() => {
  Platform.OS = originalPlatform;
  jest.clearAllMocks();
});

it('should render external link', () => {
  const { getByRole } = render(
    <ExternalLink href="https://example.com">Test Link</ExternalLink>,
  );
  expect(getByRole('link', { name: /test link/i })).toBeTruthy();
});

it('opens in an in-app browser on native platforms', async () => {
  Platform.OS = 'ios';

  const { getByRole } = render(
    <ExternalLink href="https://example.com">Native Link</ExternalLink>,
  );

  const link = getByRole('link', { name: /native link/i });
  const preventDefault = jest.fn();

  fireEvent.press(link, { preventDefault });

  await waitFor(() => {
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com');
  });
});

it('uses default browser on web without preventing default', async () => {
  Platform.OS = 'web';

  const { getByRole } = render(
    <ExternalLink href="https://example.com">Web Link</ExternalLink>,
  );

  const link = getByRole('link', { name: /web link/i });
  const preventDefault = jest.fn();

  fireEvent.press(link, { preventDefault });

  await waitFor(() => {
    expect(preventDefault).not.toHaveBeenCalled();
    expect(openBrowserAsync).not.toHaveBeenCalled();
  });
});
