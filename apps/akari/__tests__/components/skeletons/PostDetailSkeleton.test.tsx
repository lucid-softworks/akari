import { render } from '@testing-library/react-native';

import { PostDetailSkeleton } from '@/components/skeletons/PostDetailSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('PostDetailSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders skeletons for post and comments', () => {
    const { UNSAFE_getAllByType } = render(<PostDetailSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(45);
  });
});
