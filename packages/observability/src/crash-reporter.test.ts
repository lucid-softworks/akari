import type { AxiomLogger } from './logger';
import { CrashReporter } from './crash-reporter';

type TestGlobal = typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
    setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  };
  addEventListener?: jest.Mock;
  removeEventListener?: jest.Mock;
  onunhandledrejection?: ((payload: unknown) => void) | null;
};

describe('CrashReporter', () => {
  let globalScope: TestGlobal;
  let captureException: jest.Mock;
  let reporter: CrashReporter;
  let originalErrorUtils: TestGlobal['ErrorUtils'];
  let originalAddEventListener: TestGlobal['addEventListener'];
  let originalRemoveEventListener: TestGlobal['removeEventListener'];
  let originalOnUnhandledRejection: TestGlobal['onunhandledrejection'];

  beforeEach(() => {
    globalScope = globalThis as TestGlobal;
    originalErrorUtils = globalScope.ErrorUtils;
    originalAddEventListener = globalScope.addEventListener;
    originalRemoveEventListener = globalScope.removeEventListener;
    originalOnUnhandledRejection = globalScope.onunhandledrejection;

    const setGlobalHandler = jest.fn();
    const getGlobalHandler = jest.fn(() => jest.fn());

    globalScope.ErrorUtils = {
      setGlobalHandler,
      getGlobalHandler,
    };

    globalScope.addEventListener = jest.fn();
    globalScope.removeEventListener = jest.fn();
    globalScope.onunhandledrejection = null;

    captureException = jest.fn().mockResolvedValue(undefined);
    reporter = new CrashReporter({ captureException } as unknown as AxiomLogger, {
      dataset: 'crashes',
      additionalAttributes: () => ({ appVersion: '1.0.0' }),
    });
  });

  afterEach(() => {
    reporter.uninstall();
    captureException.mockClear();
    if (globalScope.ErrorUtils?.setGlobalHandler) {
      (globalScope.ErrorUtils.setGlobalHandler as jest.Mock).mockReset();
    }
    if (globalScope.ErrorUtils?.getGlobalHandler) {
      (globalScope.ErrorUtils.getGlobalHandler as jest.Mock).mockReset();
    }

    if (globalScope.addEventListener) {
      globalScope.addEventListener.mockReset();
    }
    if (globalScope.removeEventListener) {
      globalScope.removeEventListener.mockReset();
    }

    if (originalErrorUtils === undefined) {
      Reflect.deleteProperty(globalScope, 'ErrorUtils');
    } else {
      globalScope.ErrorUtils = originalErrorUtils;
    }

    if (originalAddEventListener === undefined) {
      Reflect.deleteProperty(globalScope, 'addEventListener');
    } else {
      globalScope.addEventListener = originalAddEventListener;
    }

    if (originalRemoveEventListener === undefined) {
      Reflect.deleteProperty(globalScope, 'removeEventListener');
    } else {
      globalScope.removeEventListener = originalRemoveEventListener;
    }

    if (originalOnUnhandledRejection === undefined) {
      Reflect.deleteProperty(globalScope, 'onunhandledrejection');
    } else {
      globalScope.onunhandledrejection = originalOnUnhandledRejection;
    }
  });

  it('captures errors from the React Native global handler', async () => {
    reporter.install();

    const handler = (globalScope.ErrorUtils?.setGlobalHandler as jest.Mock).mock.calls[0][0];
    handler(new Error('App crashed'), true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        appVersion: '1.0.0',
        isFatal: true,
        source: 'react-native',
      }),
      expect.objectContaining({ dataset: 'crashes' }),
    );
  });

  it('captures unhandled promise rejections when available', async () => {
    reporter.install();

    const rejectionHandler = (globalScope.addEventListener as jest.Mock).mock.calls[0][1];
    const preventDefault = jest.fn();
    const reason = new Error('Rejected promise');
    rejectionHandler({ reason, preventDefault });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(preventDefault).toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      reason,
      expect.objectContaining({ source: 'unhandled-rejection', isFatal: false }),
      expect.objectContaining({ dataset: 'crashes' }),
    );

    reporter.uninstall();
    expect(globalScope.removeEventListener).toHaveBeenCalledWith('unhandledrejection', rejectionHandler);
  });

  it('respects passthrough configuration', async () => {
    const originalHandler = jest.fn();
    (globalScope.ErrorUtils?.getGlobalHandler as jest.Mock).mockReturnValue(originalHandler);

    reporter = new CrashReporter({ captureException } as unknown as AxiomLogger, {
      dataset: 'crashes',
      passthrough: false,
    });

    reporter.install();
    const handler = (globalScope.ErrorUtils?.setGlobalHandler as jest.Mock).mock.calls[0][0];
    handler(new Error('App crashed'), true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(originalHandler).not.toHaveBeenCalled();
  });
});
