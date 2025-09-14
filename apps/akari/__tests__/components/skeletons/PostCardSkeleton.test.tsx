import { render } from '@testing-library/react-native';

import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('PostCardSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders the correct number of skeleton elements', () => {
    const { UNSAFE_getAllByType } = render(<PostCardSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(14);
  });
});
