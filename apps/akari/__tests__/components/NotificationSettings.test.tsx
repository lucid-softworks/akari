import { act, fireEvent, render } from '@testing-library/react-native';

import { NotificationSettings } from '@/components/NotificationSettings';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/usePushNotifications');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/NotificationTest', () => ({ NotificationTest: () => null }));

const mockUsePushNotifications = usePushNotifications as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('NotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
  });

  it('enables push notifications', async () => {
    const initialize = jest.fn().mockResolvedValue(true);
    const onSettingsChange = jest.fn();
    mockUsePushNotifications.mockReturnValue({
      permissionStatus: 'denied',
      expoPushToken: null,
      isLoading: false,
      error: null,
      initialize,
      clearBadge: jest.fn(),
    });

    const { getByRole } = render(
      <NotificationSettings onSettingsChange={onSettingsChange} />,
    );
    const toggle = getByRole('switch');
    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });
    expect(initialize).toHaveBeenCalled();
    expect(onSettingsChange).toHaveBeenCalled();
  });
});
