import React from 'react';
import { render } from '@testing-library/react-native';
import type { TextStyle } from 'react-native';

jest.mock('@expo/vector-icons/MaterialIcons', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Force the MaterialIcons-backed (.tsx) variant — jest-expo resolves the
// no-extension import to .ios.tsx, which uses expo-symbols' SymbolView and
// doesn't call MaterialIcons at all.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IconSymbol } = require('../../components/ui/IconSymbol.tsx');

describe('IconSymbol', () => {
  beforeEach(() => {
    (MaterialIcons as unknown as jest.Mock).mockClear();
  });

  it('renders with default size and mapped name', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="blue" />);

    const call = (MaterialIcons as unknown as jest.Mock).mock.calls[0][0];
    expect(call).toMatchObject({
      name: 'home',
      color: 'blue',
      size: 24,
    });

    const tree = toJSON() as any;
    // Wrapper style is an array: [{ width, height, ... }, style]
    expect(tree.props.style[0]).toMatchObject({
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('forwards custom size to MaterialIcons and applies style to wrapper', () => {
    const style: TextStyle = { opacity: 0.5 };
    const { toJSON } = render(
      <IconSymbol name="camera" color="red" size={32} style={style} />
    );

    const call = (MaterialIcons as unknown as jest.Mock).mock.calls[0][0];
    expect(call).toMatchObject({
      name: 'camera-alt',
      color: 'red',
      size: 32,
    });

    const tree = toJSON() as any;
    // Wrapper style is an array; the user-provided style is the second entry.
    expect(tree.props.style[0]).toMatchObject({
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(tree.props.style[1]).toEqual(style);
  });
});
