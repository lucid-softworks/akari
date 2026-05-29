import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { loadConfig } from './config.js';

const ENV_KEYS = [
  'AKARI_REGISTRY_HOST',
  'AKARI_REGISTRY_PORT',
  'AKARI_REGISTRY_DATA_FILE',
  'AKARI_REGISTRY_ADMIN_TOKEN',
  'AKARI_REGISTRY_CLIENT_TOKEN',
] as const;

describe('loadConfig', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('returns defaults when no env vars are set', () => {
    const config = loadConfig();
    expect(config).toEqual({
      host: '0.0.0.0',
      port: 3001,
      dataFile: undefined,
      adminToken: undefined,
      clientToken: undefined,
    });
  });

  it('parses all env vars on the happy path', () => {
    process.env.AKARI_REGISTRY_HOST = '127.0.0.1';
    process.env.AKARI_REGISTRY_PORT = '8080';
    process.env.AKARI_REGISTRY_DATA_FILE = '/tmp/data.json';
    process.env.AKARI_REGISTRY_ADMIN_TOKEN = 'admin-secret';
    process.env.AKARI_REGISTRY_CLIENT_TOKEN = 'client-secret';

    expect(loadConfig()).toEqual({
      host: '127.0.0.1',
      port: 8080,
      dataFile: '/tmp/data.json',
      adminToken: 'admin-secret',
      clientToken: 'client-secret',
    });
  });

  it('trims whitespace from string values', () => {
    process.env.AKARI_REGISTRY_HOST = '  example.com  ';
    process.env.AKARI_REGISTRY_DATA_FILE = '  /tmp/x.json  ';
    process.env.AKARI_REGISTRY_ADMIN_TOKEN = '  a  ';
    process.env.AKARI_REGISTRY_CLIENT_TOKEN = '  c  ';

    const config = loadConfig();
    expect(config.host).toBe('example.com');
    expect(config.dataFile).toBe('/tmp/x.json');
    expect(config.adminToken).toBe('a');
    expect(config.clientToken).toBe('c');
  });

  it('falls back to default host when host is only whitespace', () => {
    process.env.AKARI_REGISTRY_HOST = '   ';
    expect(loadConfig().host).toBe('0.0.0.0');
  });

  it('treats whitespace-only optional values as undefined', () => {
    process.env.AKARI_REGISTRY_DATA_FILE = '   ';
    process.env.AKARI_REGISTRY_ADMIN_TOKEN = '   ';
    process.env.AKARI_REGISTRY_CLIENT_TOKEN = '   ';

    const config = loadConfig();
    expect(config.dataFile).toBeUndefined();
    expect(config.adminToken).toBeUndefined();
    expect(config.clientToken).toBeUndefined();
  });

  it('uses the default port when port is unset or empty', () => {
    expect(loadConfig().port).toBe(3001);
    process.env.AKARI_REGISTRY_PORT = '';
    expect(loadConfig().port).toBe(3001);
  });

  it('throws when port is not a number', () => {
    process.env.AKARI_REGISTRY_PORT = 'abc';
    expect(() => loadConfig()).toThrow('AKARI_REGISTRY_PORT must be a positive integer.');
  });

  it('throws when port is zero', () => {
    process.env.AKARI_REGISTRY_PORT = '0';
    expect(() => loadConfig()).toThrow('AKARI_REGISTRY_PORT must be a positive integer.');
  });

  it('throws when port is negative', () => {
    process.env.AKARI_REGISTRY_PORT = '-5';
    expect(() => loadConfig()).toThrow('AKARI_REGISTRY_PORT must be a positive integer.');
  });

  it('parses a port with trailing non-numeric chars via parseInt radix 10', () => {
    process.env.AKARI_REGISTRY_PORT = '4000abc';
    expect(loadConfig().port).toBe(4000);
  });
});
