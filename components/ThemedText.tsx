import { Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const color = useThemeColor({}, 'text');

  return (
    <Text
      style={[{ color }, type === 'default' ? {} : type === 'title' ? { fontSize: 24, fontWeight: 'bold' } : type === 'defaultSemiBold' ? { fontWeight: '600' } : type === 'subtitle' ? { fontSize: 18 } : type === 'link' ? { color: '#0a7ea4' } : {}, style]}
      {...rest}
    />
  );
}

export default ThemedText;

