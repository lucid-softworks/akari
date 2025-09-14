import { render } from '@testing-library/react-native';

import { ConversationSkeleton } from '@/components/skeletons/ConversationSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('ConversationSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders the expected number of skeleton elements', () => {
    const { UNSAFE_getAllByType } = render(<ConversationSkeleton />);
    const skeletons = UNSAFE_getAllByType(Skeleton);
    expect(skeletons).toHaveLength(5);
  });
});
