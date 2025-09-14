describe('alert utilities', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('uses window.confirm on web and executes primary action', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    window.confirm = jest.fn(() => true);
    const module = require('@/utils/alert');
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    module.showAlert({
      title: 'Title',
      message: 'Message',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'OK', onPress: onConfirm },
      ],
    });
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('executes cancel action when user declines', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    window.confirm = jest.fn(() => false);
    const module = require('@/utils/alert');
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    module.showAlert({
      title: 'Title',
      message: 'Message',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'OK', onPress: onConfirm },
      ],
    });
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls Alert.alert on native platforms', () => {
    const alertMock = jest.fn();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      Alert: { alert: alertMock },
    }));
    const module = require('@/utils/alert');
    module.showAlert({ title: 'Title', message: 'Message' });
    expect(alertMock).toHaveBeenCalledWith('Title', 'Message', undefined, undefined);
  });

  it('showConfirm triggers callbacks based on user choice', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const module = require('@/utils/alert');
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    window.confirm = jest.fn(() => true);
    module.showConfirm('T', 'M', onConfirm, onCancel);
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    (window.confirm as jest.Mock).mockReturnValue(false);
    module.showConfirm('T', 'M', onConfirm, onCancel);
    expect(onCancel).toHaveBeenCalled();
  });

  it('showDestructiveConfirm executes confirm callback', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const module = require('@/utils/alert');
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    window.confirm = jest.fn(() => true);
    module.showDestructiveConfirm('T', 'M', 'Remove', onConfirm, onCancel);
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
