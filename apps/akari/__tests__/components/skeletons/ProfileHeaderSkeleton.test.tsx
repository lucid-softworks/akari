import { render } from '@testing-library/react-native';

import { ProfileHeaderSkeleton } from '@/components/skeletons/ProfileHeaderSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ProfileHeaderSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders all profile header skeleton elements', () => {
    const { UNSAFE_getAllByType } = render(<ProfileHeaderSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(14);
  });
});
