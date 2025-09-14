import { render } from '@testing-library/react-native';

import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('SettingsSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders all settings skeleton elements', () => {
    const { UNSAFE_getAllByType } = render(<SettingsSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(21);
  });
});
