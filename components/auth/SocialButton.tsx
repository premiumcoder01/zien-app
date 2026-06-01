import { Image, ImageSourcePropType, Pressable, StyleProp, Text, ViewStyle } from 'react-native';

import { useAppTheme } from '@/context/ThemeContext';

type SocialButtonProps = {
  label: string;
  icon: ImageSourcePropType;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export default function SocialButton({ label, icon, onPress, style, disabled }: SocialButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      style={[
        {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: colors.socialButtonBackground,
          borderWidth: 1,
          borderColor: colors.socialButtonBorder,
          paddingVertical: 10,
          borderRadius: colors.inputBorderRadius,
          opacity: disabled ? 0.65 : 1,
        },
        style,
      ]}
      disabled={disabled}
      onPress={onPress}>
      <Image source={icon} style={{ width: 18, height: 18 }} resizeMode="contain" />
      <Text
        style={{
          fontSize: 13.5,
          color: colors.socialButtonText,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
