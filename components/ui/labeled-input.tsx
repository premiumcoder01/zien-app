import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';

import { useAppTheme } from '@/context/ThemeContext';

type LabeledInputProps = TextInputProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  inputRowStyle?: StyleProp<ViewStyle>;
  rightLabel?: string;
  onRightLabelPress?: () => void;
  rightInputElement?: React.ReactNode;
  leftInputElement?: React.ReactNode;
  error?: string;
  required?: boolean;
};

export default function LabeledInput({
  label,
  containerStyle,
  labelStyle,
  inputStyle,
  inputRowStyle,
  rightLabel,
  onRightLabelPress,
  rightInputElement,
  leftInputElement,
  error,
  required,
  ...inputProps
}: LabeledInputProps) {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, labelStyle]}>
            {label} {required ? <Text style={{ color: '#ef4444' }}>*</Text> : null}
          </Text>
          {rightLabel ? (
            onRightLabelPress ? (
              <Pressable onPress={onRightLabelPress}>
                <Text style={styles.rightLabel}>{rightLabel}</Text>
              </Pressable>
            ) : (
              <Text style={styles.rightLabel}>{rightLabel}</Text>
            )
          ) : null}
        </View>
      ) : null}
      <View style={[styles.inputRow, inputRowStyle, !!error && { borderColor: '#ef4444' }]}>
        {leftInputElement ? <View style={styles.inputLeft}>{leftInputElement}</View> : null}
        <TextInput
          {...inputProps}
          style={[styles.input, inputStyle]}
          placeholderTextColor={inputProps.placeholderTextColor ?? colors.inputPlaceholder}
        />
        {rightInputElement ? <View style={styles.inputRight}>{rightInputElement}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rightLabel: {
    fontSize: 12.5,
    color: colors.link,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: colors.inputBorderRadius,
    borderWidth: 1,
    borderColor: colors.borderInput,
    paddingHorizontal: 14,
    height: 50
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputLeft: {
    paddingRight: 10,
  },
  inputRight: {
    paddingLeft: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -2,
  },
});
