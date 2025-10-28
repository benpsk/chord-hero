import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  HelperText,
  Menu,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import type { Theme } from 'react-native-paper';

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

  return (
    <View style={styles.wrapper}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <TouchableRipple
            style={styles.touchable}
            onPress={() => setVisible(true)}
            borderless
            disabled={disabled || options.length === 0}
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
          </TouchableRipple>
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

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    touchable: {
      borderRadius: 8,
    },
  });
