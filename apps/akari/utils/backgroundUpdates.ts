import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';

const BACKGROUND_TASK_NAME = 'task-run-expo-update';
const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';
const canDefineBackgroundTask =
  typeof TaskManager.isTaskDefined === 'function' && typeof TaskManager.defineTask === 'function';

if (isSupportedPlatform && canDefineBackgroundTask && !TaskManager.isTaskDefined(BACKGROUND_TASK_NAME)) {
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
}

export async function setupBackgroundUpdates(): Promise<void> {
  if (!isSupportedPlatform) {
    return;
  }

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

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);

    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 60 * 24,
      });
    }
  } catch (error) {
    console.error('Failed to set up background updates:', error);
  }
}
