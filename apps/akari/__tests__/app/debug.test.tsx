import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import DebugScreen from '@/app/debug';
import { showAlert } from '@/utils/alert';
import { useColorScheme } from '@/hooks/useColorScheme';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return { SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</> };
});

jest.mock('@/utils/alert');
const mockShowAlert = showAlert as jest.Mock;

jest.mock('@/hooks/useColorScheme');
const mockUseColorScheme = useColorScheme as jest.Mock;

function renderScreen(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <DebugScreen />
    </QueryClientProvider>
  );
}

describe('DebugScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('renders empty state when no queries exist', () => {
    const client = new QueryClient();
    const { getByText } = renderScreen(client);

    expect(getByText('Query Cache Debug')).toBeTruthy();
    expect(getByText('No queries in cache')).toBeTruthy();
  });

  it('shows query info and handles actions', () => {
    const client = new QueryClient();
    client.setQueryData(['test'], { value: 1 });

    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const removeSpy = jest.spyOn(client, 'removeQueries');

    const { getByText, queryByText } = renderScreen(client);

    expect(getByText('Total Queries: 1')).toBeTruthy();
    expect(getByText('Successful Queries: 1')).toBeTruthy();

    expect(queryByText('Query Key:')).toBeNull();
    fireEvent.press(getByText('Success'));
    expect(getByText('Query Key:')).toBeTruthy();

    fireEvent.press(getByText('Refetch'));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['test'] });

    fireEvent.press(getByText('Remove'));
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['test'] });
  });

  it('invalidates and clears all queries through alerts', () => {
    const client = new QueryClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    const clearSpy = jest.spyOn(client, 'clear');

    const { getByText } = renderScreen(client);

    fireEvent.press(getByText('Invalidate All'));
    const invalidateArgs = mockShowAlert.mock.calls[0][0];
    for (const button of invalidateArgs.buttons ?? []) {
      if (button.text === 'Invalidate') {
        act(() => button.onPress?.());
      }
    }
    expect(invalidateSpy).toHaveBeenCalled();

    fireEvent.press(getByText('Clear All'));
    const clearArgs = mockShowAlert.mock.calls[1][0];
    for (const button of clearArgs.buttons ?? []) {
      if (button.text === 'Clear') {
        act(() => button.onPress?.());
      }
    }
    expect(clearSpy).toHaveBeenCalled();
  });
});

