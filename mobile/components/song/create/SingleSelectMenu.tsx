import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  HelperText,
  MD3Theme,
  Menu,
  TextInput,
  useTheme,
} from 'react-native-paper';

import type { NamedOption } from './types';


type SingleSelectMenuProps = {
  label: string;
  value: NamedOption | null;
  options: NamedOption[];
  fieldKey: string;
  placeholder?: string;
  emptyPlaceholder?: string;
  icon?: string;
  supportingError?: string | null;
  fieldError?: string | null;
  clearFieldError: (field: string) => void;
  onChange: (option: NamedOption) => void;
  onClearFormFeedback: () => void;
  disabled?: boolean;
};

export function SingleSelectMenu({
  label,
  value,
  options,
  fieldKey,
  placeholder,
  emptyPlaceholder,
  icon = 'menu-down',
  supportingError,
  fieldError,
  clearFieldError,
  onChange,
  onClearFormFeedback,
  disabled,
}: SingleSelectMenuProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);

  const displayPlaceholder =
    options.length === 0 ? emptyPlaceholder ?? placeholder ?? `Loading ${label.toLowerCase()}…` : placeholder;

  const handleSelect = (option: NamedOption) => {
    onClearFormFeedback();
    clearFieldError(fieldKey);
    onChange(option);
    setVisible(false);
  };

  const handleOpen = () => {
    if (disabled || options.length === 0) {
      return;
    }
    setVisible(true);
  };

  return (
    <View style={styles.wrapper}>
      <Menu
        key={String(visible)}
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Pressable
            style={({ pressed }) => [styles.touchable, pressed && styles.touchablePressed]}
            onPress={handleOpen}
            disabled={disabled || options.length === 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || options.length === 0 }}
          >
            <View pointerEvents="none">
              <TextInput
                label={label}
                mode="outlined"
                value={value?.name ?? ''}
                placeholder={displayPlaceholder}
                editable={false}
                right={<TextInput.Icon icon={icon} />}
              />
            </View>
          </Pressable>
        }
      >
        {options.map((option) => (
          <Menu.Item key={option.id} title={option.name} onPress={() => handleSelect(option)} />
        ))}
      </Menu>

      {supportingError ? <HelperText type="error">{supportingError}</HelperText> : null}
      {fieldError ? (
        <HelperText type="error" visible>
          {fieldError}
        </HelperText>
      ) : null}
    </View>
  );
}

const createStyles = (_theme: MD3Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    touchable: {
      borderRadius: 8,
      overflow: 'hidden',
    },
    touchablePressed: {
      opacity: 0.92,
    },
  });
