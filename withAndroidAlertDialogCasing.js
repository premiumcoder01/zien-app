const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

module.exports = function withAndroidAlertDialogCasing(config) {
  return withAndroidStyles(config, (config) => {
    // 1. Add alertDialogTheme to AppTheme
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AppTheme', parent: 'Theme.AppCompat.DayNight.NoActionBar' },
      name: 'android:alertDialogTheme',
      value: '@style/AppCompatAlertDialogTheme',
    });

    // 2. Add positive, negative, and neutral button styles to AppCompatAlertDialogTheme
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AppCompatAlertDialogTheme', parent: 'Theme.AppCompat.DayNight.Dialog.Alert' },
      name: 'android:buttonBarPositiveButtonStyle',
      value: '@style/AlertButtonStyle',
    });

    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AppCompatAlertDialogTheme', parent: 'Theme.AppCompat.DayNight.Dialog.Alert' },
      name: 'android:buttonBarNegativeButtonStyle',
      value: '@style/AlertButtonStyle',
    });

    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AppCompatAlertDialogTheme', parent: 'Theme.AppCompat.DayNight.Dialog.Alert' },
      name: 'android:buttonBarNeutralButtonStyle',
      value: '@style/AlertButtonStyle',
    });

    // 3. Add textAllCaps = false to AlertButtonStyle
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      parent: { name: 'AlertButtonStyle', parent: 'Widget.AppCompat.Button.ButtonBar.AlertDialog' },
      name: 'android:textAllCaps',
      value: 'false',
    });

    return config;
  });
};
