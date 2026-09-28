import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";
import { pixelColors, pixelFont, pixelTextSize } from "@/theme/pixel";

interface SearchBarProps {
  onPress: () => void;
  placeholder: string;
}

const SearchBar = ({ onPress, placeholder }: SearchBarProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed ? styles.pressed : null]}
    >
      <Ionicons name="search-outline" size={20} color={pixelColors.gray500} />
      <TextInput
        editable={false}
        pointerEvents="none"
        placeholder={placeholder}
        placeholderTextColor={pixelColors.gray500}
        style={styles.input}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: pixelColors.surface,
    borderWidth: 1,
    borderColor: pixelColors.borderSoft,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.82,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: pixelColors.ink,
    fontFamily: pixelFont.body,
    fontSize: pixelTextSize.body,
  },
});

export default SearchBar;
