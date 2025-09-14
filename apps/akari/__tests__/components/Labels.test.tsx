import { render } from '@testing-library/react-native';

import { Labels } from '@/components/Labels';
import { useThemeColor } from '@/hooks/useThemeColor';

const mockLabel = jest.fn();

jest.mock('@/components/Label', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Label: (props: any) => {
      mockLabel(props);
      return React.createElement(Text, null, props.text);
    },
  };
});

jest.mock('@/hooks/useThemeColor');
const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseThemeColor.mockReturnValue('#000');
});

describe('Labels', () => {
  it('returns null when no labels provided', () => {
    const { toJSON } = render(<Labels />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when labels are empty after filtering', () => {
    const invalidLabels = [{ val: '   ' }];
    const { toJSON } = render(<Labels labels={invalidLabels} />);
    expect(toJSON()).toBeNull();
  });

  it('renders up to maxLabels', () => {
    const labels = [{ val: 'One' }, { val: 'Two' }, { val: 'Three' }];
    const { getByText, queryByText } = render(
      <Labels labels={labels} maxLabels={2} />,
    );
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
    expect(queryByText('Three')).toBeNull();
  });

  it('applies correct label classifications', () => {
    const labels = [
      { val: 'Spammy', neg: true },
      { val: 'Verified account' },
      { val: 'Regular user' },
    ];
    render(<Labels labels={labels} />);

    expect(mockLabel).toHaveBeenCalledTimes(3);
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Spammy', isWarning: true }),
    );
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Verified account', isPositive: true }),
    );
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Regular user' }),
    );
  });
});
