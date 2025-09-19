import { fireEvent, render } from '@testing-library/react-native';

import { TabBar } from '@/components/TabBar';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useAppTheme } from '@/theme';

jest.mock('@/hooks/useBorderColor');
jest.mock('@/theme');

const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseAppTheme = useAppTheme as jest.Mock;

describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseAppTheme.mockReturnValue({
      colors: {
        surface: '#FFFFFF',
        textMuted: '#6B7280',
        text: '#111827',
        accent: '#7C8CF9',
        shadow: 'rgba(0, 0, 0, 0.1)',
      },
    });
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
      expect.arrayContaining([expect.objectContaining({ borderBottomColor: '#7C8CF9' })]),
    );
    expect(inactiveTabStyles).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderBottomColor: 'transparent' })]),
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
