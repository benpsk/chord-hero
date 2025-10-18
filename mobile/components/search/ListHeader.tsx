import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SearchFilterBar } from "./SearchFilterBar";
import { SearchTabBar } from "./SearchTabBar";
import { type FilterLanguage } from '@/constants/home';

type ListHeaderProps = {
  query: string;
  setQuery: (q: string) => void;
  selectedLanguages: FilterLanguage[];
  setSelectedLanguages: (langs: [] | ((prev: FilterLanguage[]) => FilterLanguage[])) => void;
  activeTab: SearchTabKey;
  setActiveTab: (tab: SearchTabKey) => void;
  activeResultsCount: number;
};

type SearchTabKey = 'tracks' | 'albums' | 'artists' | 'writers' | 'releaseYears';
const SEARCH_TABS: { key: SearchTabKey; label: string }[] = [
  { key: 'tracks', label: 'Tracks' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'writers', label: 'Writers' },
  { key: 'releaseYears', label: 'Release year' },
];

export default function ListHeader({
  query,
  setQuery,
  selectedLanguages,
  setSelectedLanguages,
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
          selectedLanguages={selectedLanguages}
          onToggleLanguage={(lang) =>
            setSelectedLanguages((prev) =>
              prev.includes(lang) ? prev.filter((item) => item !== lang) : [...prev, lang]
            )
          }
          onClearLanguages={() => setSelectedLanguages([])}
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
