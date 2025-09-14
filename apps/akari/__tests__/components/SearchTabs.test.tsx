import { fireEvent, render } from '@testing-library/react-native';

import { SearchTabs } from '@/components/SearchTabs';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

jest.mock('@/hooks/useBorderColor');
jest.mock('@/hooks/useThemeColor');
jest.mock('@/hooks/useTranslation');

const mockUseBorderColor = useBorderColor as jest.Mock;
const mockUseThemeColor = useThemeColor as jest.Mock;
const mockUseTranslation = useTranslation as jest.Mock;

describe('SearchTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBorderColor.mockReturnValue('#ccc');
    mockUseThemeColor.mockReturnValue('#000');
    mockUseTranslation.mockReturnValue({
      t: (key: string) => {
        const map: Record<string, string> = {
          'search.all': 'All',
          'search.users': 'Users',
          'search.posts': 'Posts',
        };
        return map[key] ?? key;
      },
    });
  });

  it('renders translated tab labels', () => {
    const { getByText } = render(
      <SearchTabs activeTab="all" onTabChange={() => {}} />,
    );

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Users')).toBeTruthy();
    expect(getByText('Posts')).toBeTruthy();
  });

  it('triggers onTabChange when a tab is pressed', () => {
    const onTabChange = jest.fn();
    const { getByText } = render(
      <SearchTabs activeTab="all" onTabChange={onTabChange} />,
    );

    fireEvent.press(getByText('Users'));

    expect(onTabChange).toHaveBeenCalledWith('users');
  });
});
