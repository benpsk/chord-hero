import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SearchFilterBar } from "./SearchFilterBar";
import { SearchTabBar } from "./SearchTabBar";

type ListHeaderProps = {
  query: string;
  setQuery: (q: string) => void;
  languages: { id: number; name: string | null }[];
  selectedLanguageIds: number[];
  onToggleLanguage: (id: number) => void;
  onClearLanguages: () => void;
  activeTab: SearchTabKey;
  setActiveTab: (tab: SearchTabKey) => void;
  activeResultsCount: number;
};

type SearchTabKey = 'tracks' | 'myTracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';
const SEARCH_TABS: { key: SearchTabKey; label: string }[] = [
  { key: 'tracks', label: 'Tracks' },
  { key: 'myTracks', label: 'My tracks' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'writers', label: 'Writers' },
  { key: 'releaseYears', label: 'Release year' },
];

export default function ListHeader({
  query,
  setQuery,
  languages,
  selectedLanguageIds,
  onToggleLanguage,
  onClearLanguages,
  activeTab,
  setActiveTab,
  activeResultsCount,
}: ListHeaderProps) {
  return (
    <View style={{ gap: 12 }}>
      <Animated.View entering={FadeInUp.delay(60).duration(320)}>
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          languages={languages}
          selectedLanguageIds={selectedLanguageIds}
          onToggleLanguage={onToggleLanguage}
          onClearLanguages={onClearLanguages}
        />
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(100).duration(320)}>
        <SearchTabBar
          tabs={SEARCH_TABS}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      </Animated.View>
      <Animated.View style={styles.sectionHeader} entering={FadeInUp.delay(160).duration(320)}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {SEARCH_TABS.find((tab) => tab.key === activeTab)?.label}
        </Text>
        <Text variant="bodySmall">
          {activeResultsCount} result{activeResultsCount === 1 ? '' : 's'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '600',
  },
});
