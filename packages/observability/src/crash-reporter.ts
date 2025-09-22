import type { AxiomLogger } from './logger';
import type { CrashReportingConfig, LogAttributes } from './types';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ReactNativeErrorUtils = {
  getGlobalHandler?: () => ErrorHandler | undefined;
  setGlobalHandler?: (handler: ErrorHandler) => void;
};

type GlobalEventTarget = typeof globalThis & {
  ErrorUtils?: ReactNativeErrorUtils;
  addEventListener?: (event: string, handler: (payload: unknown) => void) => void;
  removeEventListener?: (event: string, handler: (payload: unknown) => void) => void;
  onunhandledrejection?: ((payload: unknown) => void) | null;
};

type PromiseRejectionPayload = {
  promise?: Promise<unknown>;
  reason?: unknown;
  preventDefault?: () => void;
};

const getErrorUtils = (): ReactNativeErrorUtils | undefined => {
  const globalScope = globalThis as GlobalEventTarget;
  return globalScope.ErrorUtils;
};

const resolveAdditionalAttributes = async (
  resolver?: CrashReportingConfig['additionalAttributes'],
): Promise<LogAttributes> => {
  if (!resolver) {
    return {};
  }

  try {
    const result = await resolver();
    return result ?? {};
  } catch (error) {
    console.warn('[observability] Failed to resolve crash reporter attributes', error);
    return {};
  }
};

export class CrashReporter {
  private readonly logger: AxiomLogger;
  private readonly config: CrashReportingConfig;
  private originalHandler?: ErrorHandler;
  private rejectionHandler?: (payload: unknown) => void;
  private previousUnhandledRejection?: ((payload: unknown) => void) | null;

  constructor(logger: AxiomLogger, config: CrashReportingConfig = {}) {
    this.logger = logger;
    this.config = config;
  }

  install() {
    if (this.config.enableGlobalHandler !== false) {
      const errorUtils = getErrorUtils();
      if (errorUtils?.setGlobalHandler) {
        this.originalHandler = errorUtils.getGlobalHandler?.();
        const handler: ErrorHandler = (error, isFatal) => {
          void this.handleError(error, isFatal, 'react-native');
          if (this.config.passthrough !== false) {
            this.originalHandler?.(error, isFatal);
          }
        };
        errorUtils.setGlobalHandler(handler);
      }
    }

    if (this.config.captureUnhandledRejections !== false) {
      const globalScope = globalThis as GlobalEventTarget;
      this.rejectionHandler = (payload: unknown) => {
        const event = payload as PromiseRejectionPayload;
        if (typeof event?.preventDefault === 'function') {
          event.preventDefault();
        }
        const reason = event?.reason ?? payload;
        void this.handleError(reason, false, 'unhandled-rejection');
        if (this.config.passthrough !== false && this.previousUnhandledRejection) {
          this.previousUnhandledRejection(event);
        }
      };

      if (typeof globalScope.addEventListener === 'function' && typeof globalScope.removeEventListener === 'function') {
        globalScope.addEventListener('unhandledrejection', this.rejectionHandler);
      } else if ('onunhandledrejection' in globalScope) {
        this.previousUnhandledRejection = globalScope.onunhandledrejection ?? null;
        globalScope.onunhandledrejection = this.rejectionHandler;
      }
    }
  }

  uninstall() {
    const errorUtils = getErrorUtils();
    if (this.originalHandler && errorUtils?.setGlobalHandler) {
      errorUtils.setGlobalHandler(this.originalHandler);
    }
    this.originalHandler = undefined;

    if (this.rejectionHandler) {
      const globalScope = globalThis as GlobalEventTarget;
      if (typeof globalScope.removeEventListener === 'function') {
        globalScope.removeEventListener('unhandledrejection', this.rejectionHandler);
      }
      if ('onunhandledrejection' in globalScope) {
        globalScope.onunhandledrejection = this.previousUnhandledRejection ?? null;
      }
    }

    this.rejectionHandler = undefined;
    this.previousUnhandledRejection = null;
  }

  private async handleError(error: unknown, isFatal: boolean | undefined, source: string) {
    const additional = await resolveAdditionalAttributes(this.config.additionalAttributes);

    const attributes: LogAttributes = {
      ...additional,
      isFatal: Boolean(isFatal),
      source,
    };

    try {
      await this.logger.captureException(error, attributes, {
        dataset: this.config.dataset,
      });
    } catch (loggingError) {
      console.warn('[observability] Failed to capture crash', loggingError);
    }
  }
}
