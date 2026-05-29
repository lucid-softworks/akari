import { Platform } from 'react-native';

import { appPlatform, buildUserAgent, getAppProps } from '@/utils/plausible/userAgent';

jest.mock('expo-application', () => ({ nativeApplicationVersion: '9.9.9' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3', extra: { variant: 'preview' } } },
}));
jest.mock('expo-device', () => ({ osVersion: '17.4', modelName: 'iPhone15,2' }));

const setPlatform = (os: string) => {
  (Platform as unknown as { OS: string }).OS = os;
};

describe('appPlatform', () => {
  afterEach(() => setPlatform('ios'));

  it('maps the native OS to a platform tag', () => {
    setPlatform('ios');
    expect(appPlatform()).toBe('ios');
    setPlatform('android');
    expect(appPlatform()).toBe('android');
    setPlatform('windows');
    expect(appPlatform()).toBe('web');
  });
});

describe('getAppProps', () => {
  it('reports version and variant from expo config', () => {
    setPlatform('ios');
    expect(getAppProps()).toEqual({
      app_platform: 'ios',
      app_version: '1.2.3',
      app_variant: 'preview',
    });
  });
});

describe('buildUserAgent', () => {
  afterEach(() => setPlatform('ios'));

  it('returns null on web', () => {
    setPlatform('web');
    expect(buildUserAgent()).toBeNull();
  });

  it('builds an iPhone UA with underscore-separated OS version', () => {
    setPlatform('ios');
    expect(buildUserAgent()).toBe(
      'Akari/1.2.3 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
    );
  });

  it('builds an Android UA with the model name', () => {
    setPlatform('android');
    expect(buildUserAgent()).toBe('Akari/1.2.3 (Linux; Android 17.4; iPhone15,2)');
  });
});
