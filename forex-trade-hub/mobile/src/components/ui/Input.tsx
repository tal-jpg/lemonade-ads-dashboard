import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  helper?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Renders a show/hide toggle and starts obscured. */
  password?: boolean;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Text field with label, validation state and optional password reveal.
 *
 * The border colour is the error channel — colour alone is never the only
 * signal, so the message text is always rendered alongside it.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, icon, password, rightAdornment, containerStyle, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [obscured, setObscured] = useState(!!password);

  const borderColor = error
    ? theme.colors.loss
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={containerStyle}>
      {label && (
        <AppText variant="captionStrong" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      )}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor,
            borderRadius: theme.radius.sm,
            borderWidth: focused || error ? theme.borderWidth.thick : theme.borderWidth.hairline,
            paddingHorizontal: theme.spacing.md,
            minHeight: rest.multiline ? 96 : 50,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textTertiary}
          />
        )}

        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={obscured}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.primary}
          style={[
            theme.typography.body,
            styles.input,
            {
              color: theme.colors.textPrimary,
              textAlignVertical: rest.multiline ? 'top' : 'center',
              paddingVertical: rest.multiline ? theme.spacing.md : 0,
            },
          ]}
        />

        {password && (
          <Pressable
            onPress={() => setObscured((v) => !v)}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={obscured ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={obscured ? 'eye-outline' : 'eye-off-outline'}
              size={19}
              color={theme.colors.textTertiary}
            />
          </Pressable>
        )}

        {rightAdornment}
      </View>

      {(error || helper) && (
        <AppText
          variant="caption"
          color={error ? 'loss' : 'textTertiary'}
          style={styles.message}
        >
          {error ?? helper}
        </AppText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, padding: 0 },
  message: { marginTop: 6 },
});
