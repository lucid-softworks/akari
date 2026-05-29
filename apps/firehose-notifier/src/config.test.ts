import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfig } from './config.js';

const REGISTRY_VARS = [
  'AKARI_NOTIFIER_REGISTRY_URL',
  'AKARI_NOTIFIER_REGISTRY_TOKEN',
  'AKARI_NOTIFIER_REGISTRY_REFRESH_MS',
  'AKARI_EXPO_ACCESS_TOKEN',
] as const;

describe('loadConfig', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of REGISTRY_VARS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of REGISTRY_VARS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('throws when the registry url is missing', () => {
    expect(() => loadConfig()).toThrow('AKARI_NOTIFIER_REGISTRY_URL is required.');
  });

  it('throws when the registry url is blank', () => {
    process.env.AKARI_NOTIFIER_REGISTRY_URL = '   ';
    expect(() => loadConfig()).toThrow('AKARI_NOTIFIER_REGISTRY_URL is required.');
  });

  it('throws when the refresh interval is not a number', () => {
    process.env.AKARI_NOTIFIER_REGISTRY_URL = 'https://registry.example';
    process.env.AKARI_NOTIFIER_REGISTRY_REFRESH_MS = 'abc';
    expect(() => loadConfig()).toThrow(
      'AKARI_NOTIFIER_REGISTRY_REFRESH_MS must be a positive integer representing milliseconds.',
    );
  });

  it('throws when the refresh interval is zero or negative', () => {
    process.env.AKARI_NOTIFIER_REGISTRY_URL = 'https://registry.example';
    process.env.AKARI_NOTIFIER_REGISTRY_REFRESH_MS = '0';
    expect(() => loadConfig()).toThrow(
      'AKARI_NOTIFIER_REGISTRY_REFRESH_MS must be a positive integer representing milliseconds.',
    );

    process.env.AKARI_NOTIFIER_REGISTRY_REFRESH_MS = '-5';
    expect(() => loadConfig()).toThrow(
      'AKARI_NOTIFIER_REGISTRY_REFRESH_MS must be a positive integer representing milliseconds.',
    );
  });

  it('loads a minimal valid config (url only)', () => {
    process.env.AKARI_NOTIFIER_REGISTRY_URL = '  https://registry.example  ';
    const config = loadConfig();
    expect(config).toEqual({
      expoAccessToken: undefined,
      registry: {
        endpoint: 'https://registry.example',
        bearerToken: undefined,
        refreshIntervalMs: undefined,
      },
    });
  });

  it('loads a full valid config with all options trimmed', () => {
    process.env.AKARI_NOTIFIER_REGISTRY_URL = 'https://registry.example';
    process.env.AKARI_NOTIFIER_REGISTRY_TOKEN = '  secret-token  ';
    process.env.AKARI_NOTIFIER_REGISTRY_REFRESH_MS = ' 60000 ';
    process.env.AKARI_EXPO_ACCESS_TOKEN = '  expo-token  ';

    const config = loadConfig();
    expect(config).toEqual({
      expoAccessToken: 'expo-token',
      registry: {
        endpoint: 'https://registry.example',
        bearerToken: 'secret-token',
        refreshIntervalMs: 60000,
      },
    });
  });
});
