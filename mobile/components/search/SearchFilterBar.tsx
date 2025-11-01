import React, { useMemo, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Chip, Menu, TextInput, useTheme } from 'react-native-paper';

import { FILTER_LANGUAGES, type FilterLanguage } from '@/constants/home';

type SearchFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  selectedLanguages: FilterLanguage[];
  onToggleLanguage: (value: FilterLanguage) => void;
  onClearLanguages: () => void;
  style?: ViewStyle;
};

export function SearchFilterBar({
  query,
  onQueryChange,
  selectedLanguages,
  onToggleLanguage,
  onClearLanguages,
  style,
}: SearchFilterBarProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          zIndex: 20,
        },
        searchInput: {
          backgroundColor: theme.colors.background,
        },
        menuContent: {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.secondary,
        },
        filtersRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 8,
        },
      }),
    [theme.colors.background, theme.colors.secondary]
  );

  return (
    <View style={[styles.container, style]}>
      <Menu
        key={String(menuVisible)}
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchorPosition="bottom"
        contentStyle={styles.menuContent}
        anchor={
          <TextInput
            mode="outlined"
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search..."
            left={<TextInput.Icon icon="magnify" />}
            right={
              <TextInput.Icon
                icon="dots-horizontal"
                onPress={() => setMenuVisible(true)}
                forceTextInputFocus={false}
              />
            }
            style={styles.searchInput}
            dense
          />
        }>
        {FILTER_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang);
          return (
            <Menu.Item
              key={lang}
              onPress={() => onToggleLanguage(lang)}
              title={lang}
              leadingIcon={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            />
          );
        })}
        <Menu.Item onPress={onClearLanguages} title="Clear" leadingIcon="close" />
      </Menu>
      {selectedLanguages.length > 0 && (
        <View style={styles.filtersRow}>
          {selectedLanguages.map((lang) => (
            <Chip key={lang} onClose={() => onToggleLanguage(lang)}>
              {lang}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}
