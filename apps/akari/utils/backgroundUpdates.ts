import { Platform } from 'react-native';

const BACKGROUND_TASK_NAME = 'task-run-expo-update';
const SUPPORTED_PLATFORMS = new Set(['ios', 'android']);

type BackgroundTaskModule = typeof import('expo-background-task');
type TaskManagerModule = typeof import('expo-task-manager');
type UpdatesModule = typeof import('expo-updates');

type BackgroundUpdateModules = {
  BackgroundTask: BackgroundTaskModule;
  TaskManager: TaskManagerModule;
  Updates: UpdatesModule;
};

let cachedModules: BackgroundUpdateModules | null | undefined;
let hasDefinedBackgroundTask = false;
let hasRegisteredBackgroundTask = false;

function loadBackgroundUpdateModules(): BackgroundUpdateModules | null {
  if (cachedModules !== undefined) {
    return cachedModules;
  }

  try {
    const BackgroundTask = require('expo-background-task') as BackgroundTaskModule;
    const TaskManager = require('expo-task-manager') as TaskManagerModule;
    const Updates = require('expo-updates') as UpdatesModule;

    cachedModules = { BackgroundTask, TaskManager, Updates };
  } catch (error) {
    if (__DEV__ && typeof jest === 'undefined') {
      console.warn('Background updates unavailable: failed to load native modules.', error);
    }

    cachedModules = null;
  }

  return cachedModules;
}

export async function setupBackgroundUpdates(): Promise<void> {
  if (!SUPPORTED_PLATFORMS.has(Platform.OS)) {
    return;
  }

  const modules = loadBackgroundUpdateModules();

  if (!modules) {
    return;
  }

  const { BackgroundTask, TaskManager, Updates } = modules;

  try {
    if (typeof TaskManager.isAvailableAsync === 'function') {
      const isAvailable = await TaskManager.isAvailableAsync();
      if (!isAvailable) {
        return;
      }
    }

    if (typeof BackgroundTask.getStatusAsync === 'function') {
      const status = await BackgroundTask.getStatusAsync();
      if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
        return;
      }
    }

    const canDefineTask =
      typeof TaskManager.defineTask === 'function' && typeof BackgroundTask.BackgroundTaskResult !== 'undefined';

    if (!canDefineTask) {
      return;
    }

    const isAlreadyDefined =
      typeof TaskManager.isTaskDefined === 'function'
        ? TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)
        : hasDefinedBackgroundTask;

    if (!isAlreadyDefined) {
      TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ error }) => {
        if (error) {
          console.error('Background updates task error:', error);
          return BackgroundTask.BackgroundTaskResult.Failed;
        }

        try {
          const update = await Updates.checkForUpdateAsync();

          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }

          return BackgroundTask.BackgroundTaskResult.Success;
        } catch (taskError) {
          console.error('Background updates task failed:', taskError);
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });

      hasDefinedBackgroundTask = true;
    }

    const isRegistered =
      typeof TaskManager.isTaskRegisteredAsync === 'function'
        ? await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME)
        : hasRegisteredBackgroundTask;

    if (!isRegistered && typeof BackgroundTask.registerTaskAsync === 'function') {
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 60 * 24,
      });

      hasRegisteredBackgroundTask = true;
    }
  } catch (error) {
    console.error('Failed to set up background updates:', error);
  }
}
