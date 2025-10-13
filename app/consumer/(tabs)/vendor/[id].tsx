import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const Vendor = () => {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>Vendor ID: {id}</Text>
    </View>
  );
};

export default Vendor;
