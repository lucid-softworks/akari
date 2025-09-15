import React from 'react';
import { render } from '@testing-library/react-native';
import type { TextStyle } from 'react-native';

jest.mock('@expo/vector-icons/MaterialIcons', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { IconSymbol } from '@/components/ui/IconSymbol.tsx';

describe('IconSymbol', () => {
  beforeEach(() => {
    (MaterialIcons as jest.Mock).mockClear();
  });

  it('renders with default size and mapped name', () => {
    const { toJSON } = render(<IconSymbol name="house.fill" color="blue" />);

    const call = (MaterialIcons as jest.Mock).mock.calls[0][0];
    expect(call).toMatchObject({
      name: 'home',
      color: 'blue',
      size: 24,
      style: undefined,
    });

    const tree = toJSON() as any;
    expect(tree.props.style).toMatchObject({
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('forwards custom size and style to MaterialIcons and wrapper', () => {
    const style: TextStyle = { opacity: 0.5 };
    const { toJSON } = render(
      <IconSymbol name="camera" color="red" size={32} style={style} />
    );

    const call = (MaterialIcons as jest.Mock).mock.calls[0][0];
    expect(call).toMatchObject({
      name: 'camera-alt',
      color: 'red',
      size: 32,
      style,
    });

    const tree = toJSON() as any;
    expect(tree.props.style).toMatchObject({
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });
});
