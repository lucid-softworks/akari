import type { ConfigContext, ExpoConfig } from '@expo/config';

import { version as packageVersion } from './package.json';

type AppVariant = 'development' | 'preview' | 'production';

type VariantDefinition = {
  appName: string;
  /**
   * Registered URL schemes for this variant. The first entry is the primary
   * brand scheme used by deep links into the app; subsequent entries are
   * additional schemes the OS must route to the app — most importantly the
   * reverse-DNS-of-bundle-id scheme that the atproto OAuth callback uses
   * (matches `redirect_uris` in the hosted client metadata).
   */
  schemes: string[];
  iosBundleIdentifier: string;
  androidPackage: string;
};

const DEFAULT_VARIANT: AppVariant = 'development';

const VARIANT_DEFINITIONS: Record<AppVariant, VariantDefinition> = {
  development: {
    appName: 'akari.blue Dev',
    schemes: ['akari.blue-dev', 'works.lucidsoft.akari.dev'],
    iosBundleIdentifier: 'works.lucidsoft.akari.dev',
    androidPackage: 'works.lucidsoft.akari.dev',
  },
  preview: {
    appName: 'akari.blue Preview',
    schemes: ['akari.blue-preview', 'works.lucidsoft.akari.preview'],
    iosBundleIdentifier: 'works.lucidsoft.akari.preview',
    androidPackage: 'works.lucidsoft.akari.preview',
  },
  production: {
    appName: 'akari.blue',
    schemes: ['akari.blue', 'works.lucidsoft.akari'],
    iosBundleIdentifier: 'works.lucidsoft.akari',
    androidPackage: 'works.lucidsoft.akari',
  },
};

const resolveVariant = (): AppVariant => {
  const rawVariant = process.env.APP_VARIANT?.toLowerCase();

  if (rawVariant) {
    if (rawVariant === 'dev') {
      return 'development';
    }

    if (rawVariant === 'prod') {
      return 'production';
    }

    if ((Object.keys(VARIANT_DEFINITIONS) as AppVariant[]).includes(rawVariant as AppVariant)) {
      return rawVariant as AppVariant;
    }
  }

  return DEFAULT_VARIANT;
};

const createConfigForVariant = (variant: AppVariant, baseConfig: ExpoConfig): Partial<ExpoConfig> => {
  const variantDefinition = VARIANT_DEFINITIONS[variant];

  const slug = baseConfig.slug;
  const projectId = baseConfig.extra?.eas?.projectId;

  return {
    name: variantDefinition.appName,
    slug,
    scheme: variantDefinition.schemes,
    ios: {
      ...(baseConfig.ios ?? {}),
      bundleIdentifier: variantDefinition.iosBundleIdentifier,
    },
    android: {
      ...(baseConfig.android ?? {}),
      package: variantDefinition.androidPackage,
    },
    extra: {
      ...(baseConfig.extra ?? {}),
      eas: {
        ...(baseConfig.extra?.eas ?? {}),
        projectId,
      },
      variant,
    },
  } satisfies Partial<ExpoConfig>;
};

export default ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const variant = resolveVariant();
  const variantConfig = createConfigForVariant(variant, config as ExpoConfig);
  const rawCommitSha = process.env.EXPO_PUBLIC_COMMIT_SHA?.trim();
  const commitSha = rawCommitSha && rawCommitSha.length > 0 ? rawCommitSha : null;

  const configExtra = config.extra as { buildMetadata?: { commitSha?: string | null } } | undefined;
  const variantExtra = variantConfig.extra as { buildMetadata?: { commitSha?: string | null } } | undefined;
  const configBuildMetadata = configExtra?.buildMetadata ?? {};
  const variantBuildMetadata = variantExtra?.buildMetadata ?? {};

  return {
    ...config,
    ...variantConfig,
    version: packageVersion,
    ios: {
      ...(config.ios ?? {}),
      ...(variantConfig.ios ?? {}),
    },
    android: {
      ...(config.android ?? {}),
      ...(variantConfig.android ?? {}),
    },
    web: {
      ...(config.web ?? {}),
      ...(variantConfig.web ?? {}),
    },
    plugins: [
      ...(Array.isArray(variantConfig.plugins)
        ? variantConfig.plugins
        : Array.isArray(config.plugins)
        ? config.plugins
        : []),
      'expo-background-task',
      'expo-font',
      'expo-localization',
      'expo-router',
      'expo-secure-store',
      'expo-video',
      'expo-web-browser',
    ],
    experiments: {
      ...(config.experiments ?? {}),
      ...(variantConfig.experiments ?? {}),
    },
    extra: {
      ...(config.extra ?? {}),
      ...(variantConfig.extra ?? {}),
      buildMetadata: {
        ...configBuildMetadata,
        ...variantBuildMetadata,
        commitSha,
      },
    },
    updates: {
      ...(config.updates ?? {}),
      ...(variantConfig.updates ?? {}),
    },
  } satisfies Partial<ExpoConfig>;
};
