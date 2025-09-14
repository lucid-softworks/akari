jest.mock('@/hooks/useHandleHistory', () => ({
  __esModule: true,
  useHandleHistory: jest.fn(),
}));
jest.mock('@/hooks/useTranslation');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useBorderColor');
jest.mock('@/utils/timeUtils');

import { fireEvent, render } from '@testing-library/react-native';

import { HandleHistoryModal } from '@/components/HandleHistoryModal';
import { useHandleHistory } from '@/hooks/useHandleHistory';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useBorderColor } from '@/hooks/useBorderColor';
import { formatRelativeTime } from '@/utils/timeUtils';

const mockUseHandleHistory = useHandleHistory as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseBorderColor = useBorderColor as jest.Mock;
const mockFormatRelativeTime = formatRelativeTime as jest.Mock;

describe('HandleHistoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue({ t: (key: string) => key });
    mockUseThemeColor.mockReturnValue('#fff');
    mockUseBorderColor.mockReturnValue('#ccc');
    mockFormatRelativeTime.mockReturnValue('relative');
  });

  it('renders loading state', () => {
    mockUseHandleHistory.mockReturnValue({ data: [], isLoading: true });

    const { getByText } = render(
      <HandleHistoryModal visible onClose={() => {}} did="did:example:123" currentHandle="alice" />,
    );

    expect(getByText('common.loading')).toBeTruthy();
  });

  it('renders empty state when no history', () => {
    mockUseHandleHistory.mockReturnValue({ data: [], isLoading: false });

    const { getByText } = render(
      <HandleHistoryModal visible onClose={() => {}} did="did:example:123" currentHandle="alice" />,
    );

    expect(getByText('profile.noHandleHistory')).toBeTruthy();
    expect(getByText('profile.noHandleHistoryDescription')).toBeTruthy();
  });

  it('renders handle history and handles close', () => {
    const onClose = jest.fn();
    mockUseHandleHistory.mockReturnValue({
      data: [
        { handle: 'alice', changedAt: '2024-01-01T00:00:00Z', pds: 'PDS1' },
        { handle: 'bob', changedAt: '2023-12-01T00:00:00Z', pds: 'PDS2' },
      ],
      isLoading: false,
    });

    const { getByText } = render(
      <HandleHistoryModal visible onClose={onClose} did="did:example:123" currentHandle="alice" />,
    );

    expect(getByText('@alice')).toBeTruthy();
    expect(getByText('common.current')).toBeTruthy();
    expect(getByText('@bob')).toBeTruthy();

    fireEvent.press(getByText('common.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

