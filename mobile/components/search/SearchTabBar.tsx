import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type SearchTab<T extends string> = {
  key: T;
  label: string;
};

type SearchTabBarProps<T extends string> = {
  tabs: SearchTab<T>[];
  activeTab: T;
  onSelect: (key: T) => void;
  style?: ViewStyle;
};

export function SearchTabBar<T extends string>({
  tabs,
  activeTab,
  onSelect,
  style,
}: SearchTabBarProps<T>) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContainer: {
          paddingTop: 8,
        },
        contentContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          paddingRight: 24,
        },
        tabButton: {
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        tabLabel: {
          fontSize: 16,
          fontWeight: '600',
        },
        tabLabelActive: {
          color: theme.colors.primary,
        },
        tabIndicator: {
          marginTop: 6,
          height: 2,
          width: 40,
          borderRadius: 1,
          backgroundColor: 'transparent',
        },
        tabIndicatorActive: {
          backgroundColor: theme.colors.primary,
        },
      }),
    [theme.colors.primary]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollContainer, style]}
      contentContainerStyle={styles.contentContainer}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
