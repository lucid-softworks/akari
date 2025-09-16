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
    mockUseThemeColor.mockImplementation(
      (props: { light?: string; dark?: string }) => props?.light ?? props?.dark ?? '#000'
    );
  });

  const flattenStyles = (style: unknown): any[] =>
    Array.isArray(style) ? style.flat(Infinity) : [style];

  it('highlights the active tab', () => {
    const tabs = [
      { key: 'home', label: 'Home' },
      { key: 'settings', label: 'Settings' },
    ] as const;

    const { getByTestId, getByText } = render(
      <TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />,
    );

    const activeTab = getByTestId('tab-home');
    const inactiveTab = getByTestId('tab-settings');
    const activeText = getByText('Home');
    const inactiveText = getByText('Settings');

    const activeTabStyles = flattenStyles(activeTab.props.style);
    const inactiveTabStyles = flattenStyles(inactiveTab.props.style);
    const activeStyles = flattenStyles(activeText.props.style);
    const inactiveStyles = flattenStyles(inactiveText.props.style);

    expect(activeTabStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderColor: '#7C8CF9' })]),
    );
    expect(inactiveTabStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderColor: 'transparent' })]),
    );
    expect(activeStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: '600', color: '#111827' }),
      ]),
    );
    expect(inactiveStyles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontWeight: '500', color: '#6B7280' }),
      ]),
    );
  });

  it('calls onTabChange when a tab is pressed', () => {
    const tabs = [
      { key: 'home', label: 'Home' },
      { key: 'settings', label: 'Settings' },
    ] as const;
    const onTabChange = jest.fn();

    const { getByTestId } = render(
      <TabBar tabs={tabs} activeTab="home" onTabChange={onTabChange} />,
    );

    fireEvent.press(getByTestId('tab-settings'));

    expect(onTabChange).toHaveBeenCalledWith('settings');
  });
});
