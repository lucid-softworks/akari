import { render } from '@testing-library/react-native';

import { NotificationSkeleton } from '@/components/skeletons/NotificationSkeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeColor } from '@/hooks/useThemeColor';

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

describe('NotificationSkeleton', () => {
  beforeEach(() => {
    mockUseThemeColor.mockImplementation((colors) => colors.light);
  });

  it('renders all skeleton placeholders', () => {
    const { UNSAFE_getAllByType } = render(<NotificationSkeleton />);
    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(10);
  });
});
