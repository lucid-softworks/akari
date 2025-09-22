import type { ConfigContext, ExpoConfig } from '@expo/config';

type AppVariant = 'development' | 'preview' | 'production';

type VariantDefinition = {
  appName: string;
  scheme: string;
  iosBundleIdentifier: string;
  androidPackage: string;
};

type AxiomExtra = {
  dataset?: string;
  token?: string;
  environment?: string;
  releaseChannel?: string;
  flushOnCapture?: boolean;
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const envKeyForVariant = (baseKey: string, variant: AppVariant): string => `${baseKey}_${variant.toUpperCase()}`;

const getEnvValueForVariant = (baseKey: string, variant: AppVariant): string | undefined => {
  const variantKey = envKeyForVariant(baseKey, variant);
  const variantValue = process.env[variantKey];
  if (typeof variantValue === 'string' && variantValue.trim()) {
    return variantValue;
  }

  const baseValue = process.env[baseKey];
  if (typeof baseValue === 'string' && baseValue.trim()) {
    return baseValue;
  }

  return undefined;
};

const parseBooleanEnvValue = (value: string | undefined): boolean | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n') {
    return false;
  }

  return undefined;
};

const createAxiomExtra = (variant: AppVariant): AxiomExtra | undefined => {
  const dataset = getEnvValueForVariant('AXIOM_DATASET', variant);
  const token = getEnvValueForVariant('AXIOM_TOKEN', variant);
  const releaseChannel = getEnvValueForVariant('AXIOM_RELEASE_CHANNEL', variant);
  const flushOnCapture = parseBooleanEnvValue(getEnvValueForVariant('AXIOM_FLUSH_ON_CAPTURE', variant));

  if (!dataset && !token && !releaseChannel && flushOnCapture === undefined) {
    return undefined;
  }

  const axiomExtra: AxiomExtra = { environment: variant };

  if (dataset) {
    axiomExtra.dataset = dataset;
  }

  if (token) {
    axiomExtra.token = token;
  }

  axiomExtra.releaseChannel = releaseChannel ?? variant;

  if (flushOnCapture !== undefined) {
    axiomExtra.flushOnCapture = flushOnCapture;
  }

  return axiomExtra;
};

const DEFAULT_VARIANT: AppVariant = 'development';

const FALLBACK_SLUG = 'akari-v2';
const FALLBACK_PROJECT_ID = '544afaeb-5cfb-40ab-b8ff-6e7154c49d1d';

const VARIANT_DEFINITIONS: Record<AppVariant, VariantDefinition> = {
  development: {
    appName: 'akari-v2 Dev',
    scheme: 'akariv2dev',
    iosBundleIdentifier: 'com.imlunahey.akariv2.dev',
    androidPackage: 'com.imlunahey.akariv2.dev',
  },
  preview: {
    appName: 'akari-v2 Preview',
    scheme: 'akariv2preview',
    iosBundleIdentifier: 'com.imlunahey.akariv2.preview',
    androidPackage: 'com.imlunahey.akariv2.preview',
  },
  production: {
    appName: 'akari-v2',
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

const createConfigForVariant = (
  variant: AppVariant,
  baseConfig: ExpoConfig,
): Partial<ExpoConfig> => {
  const variantDefinition = VARIANT_DEFINITIONS[variant];

  const slug = baseConfig.slug ?? FALLBACK_SLUG;
  const projectId = baseConfig.extra?.eas?.projectId ?? FALLBACK_PROJECT_ID;
  const axiomExtra = createAxiomExtra(variant);

  const baseExtra = toRecord(baseConfig.extra);
  const baseEas = toRecord(baseExtra.eas);
  const baseAxiom = toRecord(baseExtra.axiom);

  const mergedExtra: Record<string, unknown> = {
    ...baseExtra,
    eas: {
      ...baseEas,
      projectId,
    },
    variant,
  };

  if (axiomExtra) {
    mergedExtra.axiom = {
      ...baseAxiom,
      ...axiomExtra,
    };
  }

  return {
    name: variantDefinition.appName,
    slug,
    scheme: variantDefinition.scheme,
    ios: {
      ...(baseConfig.ios ?? {}),
      bundleIdentifier: variantDefinition.iosBundleIdentifier,
    },
    android: {
      ...(baseConfig.android ?? {}),
      package: variantDefinition.androidPackage,
    },
    extra: {
      ...mergedExtra,
    },
  } satisfies Partial<ExpoConfig>;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const variantConfig = createConfigForVariant(variant, config as ExpoConfig);

  return {
    ...config,
    ...variantConfig,
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
    plugins: variantConfig.plugins ?? config.plugins,
    experiments: {
      ...(config.experiments ?? {}),
      ...(variantConfig.experiments ?? {}),
    },
    extra: {
      ...(config.extra ?? {}),
      ...(variantConfig.extra ?? {}),
    },
    updates: {
      ...(config.updates ?? {}),
      ...(variantConfig.updates ?? {}),
    },
  } satisfies ExpoConfig;
};
