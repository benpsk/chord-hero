declare module 'react-native-dropdown-picker' {
  import { ComponentType, ReactNode } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export type ItemType<Value = string> = {
    label: string;
    value: Value;
    icon?: () => ReactNode;
    disabled?: boolean;
  };

  export interface DropDownPickerProps<Value = string> {
    open: boolean;
    value: Value[];
    items: ItemType<Value>[];
    setOpen: (open: boolean) => void;
    setValue: (value: Value[] | ((val: Value[]) => Value[])) => void;
    setItems: (
      items: ItemType<Value>[] | ((items: ItemType<Value>[]) => ItemType<Value>[])
    ) => void;
    multiple?: boolean;
    mode?: 'BADGE' | 'DEFAULT';
    placeholder?: string;
    listMode?: 'SCROLLVIEW' | 'FLATLIST' | 'MODAL';
    style?: ViewStyle;
    dropDownContainerStyle?: ViewStyle;
    textStyle?: TextStyle;
    listItemLabelStyle?: TextStyle;
    badgeDotColors?: string[];
    badgeStyles?: ViewStyle;
    badgeTextStyle?: TextStyle;
    theme?: 'LIGHT' | 'DARK';
    onChangeValue?: (value: Value[] | null) => void;
  }

  const DropDownPicker: ComponentType<DropDownPickerProps<any>>;
  export default DropDownPicker;
}
