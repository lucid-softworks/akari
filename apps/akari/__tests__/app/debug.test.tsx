import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
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

  it('handles edge cases in query formatting and toggling', async () => {
    const client = new QueryClient();

    const circular: any = {};
    circular.self = circular;

    let errorAccessCount = 0;
    const customQuery: any = {
      queryKey: ['edge'],
      state: {
        status: 'idle',
        data: circular,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: Date.now(),
        get error() {
          errorAccessCount += 1;
          return errorAccessCount === 1 ? { message: 'first' } : null;
        },
      },
    };

    const pendingQuery: any = {
      queryKey: ['pending'],
      state: {
        status: 'pending',
        data: { loading: true },
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: Date.now(),
      },
    };

    const errorQuery: any = {
      queryKey: ['error'],
      state: {
        status: 'error',
        error: { message: 'failure' },
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: Date.now(),
      },
    };

    const getAllSpy = jest.spyOn(client.getQueryCache(), 'getAll');
    getAllSpy.mockReturnValue([customQuery, pendingQuery, errorQuery]);

    const { getByText, getAllByText, queryByText } = renderScreen(client);

    const statusToggle = () => getAllByText('Unknown')[0];

    fireEvent.press(statusToggle());

    expect(getByText('Query Key:')).toBeTruthy();
    expect(getByText('Unable to stringify data')).toBeTruthy();
    expect(getByText('null')).toBeTruthy();
    expect(getByText('Loading')).toBeTruthy();
    expect(getByText('Error')).toBeTruthy();

    fireEvent.press(statusToggle());

    await waitFor(() => {
      expect(queryByText('Query Key:')).toBeNull();
    });

    getAllSpy.mockRestore();
  });

  it('falls back to light theme values and truncates long query keys', () => {
    const client = new QueryClient();
    mockUseColorScheme.mockReturnValue(undefined);

    const longKey = 'x'.repeat(150);
    const longQuery: any = {
      queryKey: [longKey],
      state: {
        status: 'pending',
        data: { value: 42 },
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchCount: 5,
        error: { message: 'failure' },
      },
    };

    const getAllSpy = jest.spyOn(client.getQueryCache(), 'getAll');
    getAllSpy.mockReturnValue([longQuery]);

    const { getByText, getAllByText } = renderScreen(client);

    const fullKey = JSON.stringify(longQuery.queryKey, null, 2);
    const truncatedKey = fullKey.substring(0, 100) + '...';
    expect(getByText(truncatedKey)).toBeTruthy();

    const statusToggle = getAllByText('Loading')[0];
    fireEvent.press(statusToggle);

    expect(getByText(fullKey)).toBeTruthy();
    expect(getAllByText('Never').length).toBeGreaterThanOrEqual(2);

    getAllSpy.mockRestore();
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

