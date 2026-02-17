import { Text, View } from "react-native";
import { useSearchContext } from "@/context/SearchContext";

export default function CurrentlyScreen() {
  const { searchText } = useSearchContext();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Currently</Text>
      <Text>{searchText}</Text>
    </View>
  );
}
