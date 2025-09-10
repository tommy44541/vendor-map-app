import React from "react";
import { TextInput, View } from "react-native";

interface SearchBarProps {
  onPress: () => void;
  placeholder: string;
}

const SearchBar = ({ onPress, placeholder }: SearchBarProps) => {
  return (
    <View className="flex-row items-center bg-dark-200 rounded-full px-5 py-4">
      {/* <Image
        source={}
        className="size-5"
        resizeMode="contain"
        tintColor="#ab8bff"
      /> */}
      <TextInput
        onPress={() => {}}
        placeholder="Search"
        value=""
        onChangeText={() => {}}
        placeholderTextColor="#ab85db"
        className="flex-1 ml-2 text-white"
      />
    </View>
  );
};

export default SearchBar;
