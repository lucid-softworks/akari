import { fireEvent, render } from '@testing-library/react-native';

import { TabBar } from '@/components/TabBar';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');

const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseThemeColor.mockReturnValue('#000');
  });

  const flattenStyles = (style: unknown): any[] =>
    Array.isArray(style) ? style.flat(Infinity) : [style];

  it('highlights the active tab', () => {
    const tabs = [
      { key: 'home', label: 'Home' },
      { key: 'settings', label: 'Settings' },
    ] as const;

    const { getByText } = render(
      <TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />,
    );

    const activeText = getByText('Home');
    const inactiveText = getByText('Settings');

    const activeStyles = flattenStyles(activeText.props.style);
    const inactiveStyles = flattenStyles(inactiveText.props.style);

    expect(activeStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontWeight: '600' })]),
    );
    expect(inactiveStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontWeight: '400' })]),
    );
  });

  it('calls onTabChange when a tab is pressed', () => {
    const tabs = [
      { key: 'home', label: 'Home' },
      { key: 'settings', label: 'Settings' },
    ] as const;
    const onTabChange = jest.fn();

    const { getByText } = render(
      <TabBar tabs={tabs} activeTab="home" onTabChange={onTabChange} />,
    );

    fireEvent.press(getByText('Settings'));

    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
