import { render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Text } from 'react-native';

const mockPressable = jest.fn((_props: any) => null);
jest.mock('@react-navigation/elements', () => ({
  PlatformPressable: (props: any) => {
    mockPressable(props);
    return null;
  },
}));

import { HapticTab } from '@/components/HapticTab';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('HapticTab', () => {
  const originalEnv = process.env.EXPO_OS;

  afterEach(() => {
    process.env.EXPO_OS = originalEnv;
    jest.clearAllMocks();
  });

  it('triggers light haptic feedback on iOS press', () => {
    process.env.EXPO_OS = 'ios';
    const onTabPress = jest.fn();
    const onPress = jest.fn();
    render(
      <HapticTab onTabPress={onTabPress} onPress={onPress}>
        <Text>tab</Text>
      </HapticTab>,
    );
    const props = mockPressable.mock.calls[0]?.[0];
    expect(props).toBeDefined();
    props.onPressIn({});
    props.onPress({});
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onTabPress).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });
});
