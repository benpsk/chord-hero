import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';

import { ThemedText } from '@/components/ThemedText';

export function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <List.Accordion expanded={open} onPress={() => setOpen(!open)} title={<ThemedText type="defaultSemiBold">{title}</ThemedText>}>
        <View style={styles.content}>{children}</View>
      </List.Accordion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  content: {
    gap: 8,
    marginBottom: 8,
  },
});

