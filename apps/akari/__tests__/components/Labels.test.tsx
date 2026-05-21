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

jest.mock('@/components/LabelDetailModal', () => ({ LabelDetailModal: () => null }));
jest.mock('@/hooks/queries/useLabelers', () => ({
  useLabelers: () => ({ data: [] }),
}));

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

  it('hides the !no-unauthenticated system label', () => {
    const labels = [
      { val: '!no-unauthenticated' },
      { val: 'verified' },
    ];
    render(<Labels labels={labels} />);
    expect(mockLabel).toHaveBeenCalledTimes(1);
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'verified' }),
    );
  });

  it('applies correct label classifications', () => {
    const labels = [
      { val: 'spam' },
      { val: 'verified' },
      { val: 'Regular user' },
    ];
    render(<Labels labels={labels} />);

    expect(mockLabel).toHaveBeenCalledTimes(3);
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'spam', isWarning: true }),
    );
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'verified', isPositive: true }),
    );
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Regular user' }),
    );
  });

  it('filters out negated labels', () => {
    const labels = [
      { val: 'spam', neg: true },
      { val: 'verified' },
    ];
    render(<Labels labels={labels} />);
    expect(mockLabel).toHaveBeenCalledTimes(1);
    expect(mockLabel).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'verified' }),
    );
  });
});
