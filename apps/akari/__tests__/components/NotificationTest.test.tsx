import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { NotificationTest } from '@/components/NotificationTest';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { scheduleLocalNotification } from '@/utils/notifications';

jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');
jest.mock('@/utils/notifications');
jest.mock('@/components/ui/IconSymbol', () => ({ IconSymbol: () => null }));

const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockScheduleLocalNotification = scheduleLocalNotification as jest.Mock;

describe('NotificationTest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockScheduleLocalNotification.mockResolvedValue('123');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('sends a test notification', async () => {
    const onSent = jest.fn();
    const { getByText } = render(
      <NotificationTest onNotificationSent={onSent} />,
    );
    await act(async () => {
      await fireEvent.press(getByText('notifications.sendTest'));
    });
    expect(mockScheduleLocalNotification).toHaveBeenCalledWith(
      'Test Notification',
      'This is a test notification from Akari v2!',
      { type: 'test', timestamp: expect.any(String) },
    );
    expect(onSent).toHaveBeenCalled();
  });

  it('schedules a delayed test notification', async () => {
    const { getByText } = render(<NotificationTest />);
    await act(async () => {
      await fireEvent.press(getByText('notifications.scheduleTest'));
    });
    expect(mockScheduleLocalNotification).toHaveBeenCalledWith(
      'Delayed Test Notification',
      'This notification was scheduled to appear 5 seconds later!',
      { type: 'test', timestamp: expect.any(String) },
    );
  });
});
