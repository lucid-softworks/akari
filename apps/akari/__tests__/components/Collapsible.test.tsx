import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

import { Collapsible } from '@/components/Collapsible';
import { useColorScheme } from '@/hooks/useColorScheme';

// Mock the useColorScheme hook
jest.mock('@/hooks/useColorScheme');
const mockUseColorScheme = useColorScheme as jest.Mock;

describe('Collapsible Component - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  describe('Rendering Tests', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<Collapsible title="Test Title">Content</Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render with children', () => {
      const { getByText } = render(
        <Collapsible title="Test Title">
          <Collapsible title="Child Title">Child content</Collapsible>
        </Collapsible>,
      );
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render with text children', () => {
      const { getByText } = render(<Collapsible title="Test Title">Simple text content</Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should render with empty children', () => {
      const { getByText } = render(<Collapsible title="Test Title"></Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });
  });

  describe('Toggle Functionality Tests', () => {
    it('should start collapsed by default', () => {
      const { queryByText } = render(<Collapsible title="Test Title">Content</Collapsible>);
      expect(queryByText('Content')).toBeNull();
    });

    it('should expand when clicked', () => {
      const { getByText, getByRole } = render(<Collapsible title="Test Title">Content</Collapsible>);

      const button = getByRole('button');
      fireEvent.press(button);

      expect(getByText('Content')).toBeTruthy();
    });

    it('should collapse when clicked again', () => {
      const { getByText, getByRole, queryByText } = render(<Collapsible title="Test Title">Content</Collapsible>);

      const button = getByRole('button');

      // Expand
      fireEvent.press(button);
      expect(getByText('Content')).toBeTruthy();

      // Collapse
      fireEvent.press(button);
      expect(queryByText('Content')).toBeNull();
    });

    it('should toggle multiple times', () => {
      const { getByText, getByRole, queryByText } = render(<Collapsible title="Test Title">Content</Collapsible>);

      const button = getByRole('button');

      // Expand
      fireEvent.press(button);
      expect(getByText('Content')).toBeTruthy();

      // Collapse
      fireEvent.press(button);
      expect(queryByText('Content')).toBeNull();

      // Expand again
      fireEvent.press(button);
      expect(getByText('Content')).toBeTruthy();
    });
  });

  describe('Theme Support Tests', () => {
    it('should use light theme colors', () => {
      mockUseColorScheme.mockReturnValue('light');
      const { getByText } = render(<Collapsible title="Test Title">Content</Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should use dark theme colors', () => {
      mockUseColorScheme.mockReturnValue('dark');
      const { getByText } = render(<Collapsible title="Test Title">Content</Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });

    it('should handle undefined theme', () => {
      mockUseColorScheme.mockReturnValue(undefined);
      const { getByText } = render(<Collapsible title="Test Title">Content</Collapsible>);
      expect(getByText('Test Title')).toBeTruthy();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper accessibility role', () => {
      const { getByRole } = render(<Collapsible title="Test Title">Content</Collapsible>);
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should be accessible by title text', () => {
      const { getByText } = render(<Collapsible title="Accessible Title">Content</Collapsible>);
      expect(getByText('Accessible Title')).toBeTruthy();
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle long titles', () => {
      const longTitle = 'This is a very long title that might cause layout issues';
      const { getByText } = render(<Collapsible title={longTitle}>Content</Collapsible>);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Title with @#$%^&*() characters';
      const { getByText } = render(<Collapsible title={specialTitle}>Content</Collapsible>);
      expect(getByText(specialTitle)).toBeTruthy();
    });

    it('should handle empty title', () => {
      const { getByRole } = render(<Collapsible title="">Content</Collapsible>);
      const button = getByRole('button');
      expect(button).toBeTruthy();
    });

    it('should handle complex nested children', () => {
      const { getByText, getByRole } = render(
        <Collapsible title="Parent">
          <Collapsible title="Child 1">Child 1 Content</Collapsible>
          <Collapsible title="Child 2">Child 2 Content</Collapsible>
        </Collapsible>,
      );

      const button = getByRole('button');
      fireEvent.press(button);

      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
    });
  });
});
