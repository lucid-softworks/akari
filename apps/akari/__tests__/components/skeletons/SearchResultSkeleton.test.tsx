import { render } from '@testing-library/react-native';

import { SearchResultSkeleton } from '@/components/skeletons/SearchResultSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('SearchResultSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders all skeleton elements for a search result', () => {
    const { UNSAFE_getAllByType } = render(<SearchResultSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(4);
  });
});
