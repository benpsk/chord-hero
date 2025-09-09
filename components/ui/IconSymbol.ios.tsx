import { SymbolView, type SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { type StyleProp, type ViewStyle } from 'react-native';

type IconSymbolName = SymbolViewProps['name'];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return <SymbolView name={name} size={size} tintColor={color} style={style} weight={weight} />;
}
