import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { MarqueeText } from './MarqueeText';

type Props = {
  title: string;
  singer?: string | undefined;
  composer?: string | undefined;
};

const SongHeaderTitle: React.FC<Props> = ({ title, singer, composer }) => {
  const theme = useTheme();
  const subtitleParts: string[] = [];
  if (singer) subtitleParts.push(singer);
  if (composer) subtitleParts.push(composer);
  const subtitle = subtitleParts.join(' · ');

  return (
    <View style={styles.container}>
      <MarqueeText
        text={title}
        style={[styles.title, { color: theme.colors.onSurface }]}
        speed={60}
      />
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { maxWidth: '100%' },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12 },
});

export default SongHeaderTitle;
