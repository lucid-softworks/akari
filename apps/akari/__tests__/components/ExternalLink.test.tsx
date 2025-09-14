import { render } from '@testing-library/react-native';
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

it('should render external link', () => {
  const { getByRole } = render(
    <ExternalLink href="https://example.com">Test Link</ExternalLink>,
  );
  expect(getByRole('link', { name: /test link/i })).toBeTruthy();
});
