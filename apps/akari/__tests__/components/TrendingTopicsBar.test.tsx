import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TrendingTopicsBar } from '@/components/TrendingTopicsBar';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';

jest.mock('@/hooks/queries/useTrendingTopics', () => ({
  useTrendingTopics: jest.fn(),
}));

describe('TrendingTopicsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTrendingTopics as jest.Mock).mockReturnValue({ data: [] });
  });

  it('renders trending topics and notifies when a topic is pressed', () => {
    const handlePress = jest.fn();
    (useTrendingTopics as jest.Mock).mockReturnValue({
      data: [{ topic: '#bluesky', link: '/search?q=%23bluesky' }],
    });

    const { getByRole } = render(<TrendingTopicsBar onTopicPress={handlePress} />);

    const topicChip = getByRole('button', { name: '#bluesky' });
    fireEvent.press(topicChip);

    expect(handlePress).toHaveBeenCalledWith('#bluesky', '/search?q=%23bluesky');
  });

  it('renders nothing when there are no topics', () => {
    const { toJSON } = render(<TrendingTopicsBar />);

    expect(toJSON()).toBeNull();
  });
});

