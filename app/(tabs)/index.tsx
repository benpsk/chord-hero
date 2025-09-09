import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Searchbar, List, Text, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SONGS } from '@/constants/songs';

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SONGS;
    return SONGS.filter((s) =>
      s.title.toLowerCase().includes(q) || (s.artist ?? '').toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search songs"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/song/[id]' as any, params: { id: item.id } })}>
            <List.Item
              title={item.title}
              description={item.artist}
              right={() => <Text style={styles.keyText}>{item.key ?? ''}</Text>}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 12 },
  listContent: { paddingBottom: 24 },
  keyText: { alignSelf: 'center', paddingRight: 12 },
});
