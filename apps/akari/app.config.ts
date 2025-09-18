import type { ConfigContext, ExpoConfig } from '@expo/config';

type AppVariant = 'development' | 'preview' | 'production';

type VariantDefinition = {
  appName: string;
  slug: string;
  scheme: string;
  iosBundleIdentifier: string;
  androidPackage: string;
};

const DEFAULT_VARIANT: AppVariant = 'development';

const VARIANT_DEFINITIONS: Record<AppVariant, VariantDefinition> = {
  development: {
    appName: 'akari-v2 Dev',
    slug: 'akari-v2-dev',
    scheme: 'akariv2dev',
    iosBundleIdentifier: 'com.imlunahey.akariv2.dev',
    androidPackage: 'com.imlunahey.akariv2.dev',
  },
  preview: {
    appName: 'akari-v2 Preview',
    slug: 'akari-v2-preview',
    scheme: 'akariv2preview',
    iosBundleIdentifier: 'com.imlunahey.akariv2.preview',
    androidPackage: 'com.imlunahey.akariv2.preview',
  },
  production: {
    appName: 'akari-v2',
    slug: 'akari-v2',
    scheme: 'akariv2',
    iosBundleIdentifier: 'com.imlunahey.akariv2',
    androidPackage: 'com.imlunahey.akariv2',
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

const createConfigForVariant = (variant: AppVariant): ExpoConfig => {
  const variantDefinition = VARIANT_DEFINITIONS[variant];

  return {
    name: variantDefinition.appName,
    slug: variantDefinition.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: variantDefinition.scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantDefinition.iosBundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        ExpoLocalization_supportsRTL: true,
      },
      entitlements: {
        'aps-environment': 'development',
        'com.apple.developer.associated-domains': ['applinks:*.expo.dev'],
      },
      runtimeVersion: '1.0.0',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: variantDefinition.androidPackage,
      permissions: ['android.permission.RECORD_AUDIO'],
      runtimeVersion: {
        policy: 'appVersion',
      },
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
      template: './web/index.html',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      [
        'expo-localization',
        {
          supportedLocales: {
            ios: ['en', 'en-US', 'ja', 'ar', 'fr'],
            android: ['en', 'en-US', 'ja', 'ar', 'fr'],
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#007AFF',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them in your posts.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      turboModules: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '544afaeb-5cfb-40ab-b8ff-6e7154c49d1d',
      },
      supportsRTL: true,
      variant,
    },
    updates: {
      url: 'https://u.expo.dev/544afaeb-5cfb-40ab-b8ff-6e7154c49d1d',
    },
  } satisfies ExpoConfig;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const variantConfig = createConfigForVariant(variant);

  return {
    ...config,
    ...variantConfig,
    ios: {
      ...(config.ios ?? {}),
      ...variantConfig.ios,
    },
    android: {
      ...(config.android ?? {}),
      ...variantConfig.android,
    },
    web: {
      ...(config.web ?? {}),
      ...variantConfig.web,
    },
    plugins: variantConfig.plugins,
    experiments: {
      ...(config.experiments ?? {}),
      ...variantConfig.experiments,
    },
    extra: {
      ...(config.extra ?? {}),
      ...variantConfig.extra,
    },
    updates: {
      ...(config.updates ?? {}),
      ...variantConfig.updates,
    },
  } satisfies ExpoConfig;
};
