import { ExternalLink } from '@/components/ExternalLink';
import { render } from '@testing-library/react-native';

it('should render external link', () => {
  const { getByText } = render(<ExternalLink href="https://example.com">Test Link</ExternalLink>);
  expect(getByText('Test Link')).toBeTruthy();
});
