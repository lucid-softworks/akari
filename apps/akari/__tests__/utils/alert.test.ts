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

  it('falls back to title when message is missing and no buttons supplied', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const confirmMock = jest.fn(() => true);
    window.confirm = confirmMock;
    const module = require('@/utils/alert');

    module.showAlert({ title: 'Title Only' });

    expect(confirmMock).toHaveBeenCalledWith('Title Only');
  });

  it('uses the first button when only cancel buttons are provided', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const cancelPress = jest.fn();
    window.confirm = jest.fn(() => true);
    const module = require('@/utils/alert');

    module.showAlert({
      title: 'Title',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: cancelPress,
        },
      ],
    });

    expect(cancelPress).toHaveBeenCalled();
  });

  it('does not attempt to call a missing primary button handler', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const cancelPress = jest.fn();
    window.confirm = jest.fn(() => true);
    const module = require('@/utils/alert');

    module.showAlert({
      title: 'Title',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: cancelPress },
        { text: 'OK' },
      ],
    });

    expect(cancelPress).not.toHaveBeenCalled();
  });

  it('gracefully handles cancel buttons without handlers when declined', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const confirmPress = jest.fn();
    window.confirm = jest.fn(() => false);
    const module = require('@/utils/alert');

    expect(() =>
      module.showAlert({
        title: 'Title',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: confirmPress },
        ],
      }),
    ).not.toThrow();

    expect(confirmPress).not.toHaveBeenCalled();
  });

  it('ignores empty button arrays', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const confirmMock = jest.fn(() => true);
    window.confirm = confirmMock;
    const module = require('@/utils/alert');

    module.showAlert({
      title: 'Title',
      buttons: [],
    });

    expect(confirmMock).toHaveBeenCalledWith('Title');
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

  it('showDestructiveConfirm works when confirm text is omitted', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: jest.fn() },
    }));
    const module = require('@/utils/alert');
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const confirmMock = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    window.confirm = confirmMock;

    module.showDestructiveConfirm('T', 'M', undefined, onConfirm, onCancel);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    module.showDestructiveConfirm('T', 'M', undefined, onConfirm, onCancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
