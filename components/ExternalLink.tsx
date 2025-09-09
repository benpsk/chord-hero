import { Linking, Platform, TextProps } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

export function ExternalLink(props: TextProps & { href: string }) {
  return (
    <ThemedText
      {...props}
      role="link"
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          Linking.openURL(props.href);
        }
      }}
    />
  );
}

