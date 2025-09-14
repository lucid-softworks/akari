import { render } from '@testing-library/react-native';

import { FeedSkeleton } from '@/components/skeletons/FeedSkeleton';
import { PostCardSkeleton } from '@/components/skeletons/PostCardSkeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('FeedSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders three post card skeletons by default', () => {
    const { UNSAFE_getAllByType } = render(<FeedSkeleton />);
    expect(UNSAFE_getAllByType(PostCardSkeleton)).toHaveLength(3);
  });

  it('renders the specified number of post card skeletons', () => {
    const { UNSAFE_getAllByType } = render(<FeedSkeleton count={5} />);
    expect(UNSAFE_getAllByType(PostCardSkeleton)).toHaveLength(5);
  });
});
