import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('ComponentErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light ?? '#fff');
    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
      changeLanguage: jest.fn(),
      currentLocale: 'en',
      availableLocales: [],
      locale: 'en',
    });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('renders its children when no error is thrown', () => {
    const { getByText } = render(
      <ComponentErrorBoundary>
        <Text>content</Text>
      </ComponentErrorBoundary>,
    );

    expect(getByText('content')).toBeTruthy();
    expect(mockUseThemeColor).not.toHaveBeenCalled();
  });

  it('shows the fallback message when a child throws', () => {
    const ProblemChild = () => {
      throw new Error('test');
    };

    const { getByText } = render(
      <ComponentErrorBoundary>
        <ProblemChild />
      </ComponentErrorBoundary>,
    );

    expect(getByText('notifications.somethingWentWrong')).toBeTruthy();
    expect(mockUseThemeColor).toHaveBeenCalled();
  });
});
