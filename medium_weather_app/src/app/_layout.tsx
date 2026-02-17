import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { SearchProvider } from "../context/SearchContext";

const GEO_BUTTON_SIZE = 36;
const SEARCH_TO_BUTTON_GAP = 12;

function TopBar({
  searchText,
  setSearchText,
  onGeoPress,
}: {
  searchText: string;
  setSearchText: (value: string) => void;
  onGeoPress: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={18} color="#64748b" />
        <TextInput
          placeholder="Search city"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
					// when enter, set the search text to the input value
					onSubmitEditing={(event) => setSearchText(event.nativeEvent.text)}
        />
      </View>
      <Pressable style={styles.geoButton} onPress={onGeoPress}>
        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0f172a" />
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [searchText, setSearchText] = useState("");
  const recordCurrentPosition = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setSearchText("Location permission denied");
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setSearchText(
        `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
      );
    } catch {
      setSearchText("Location unavailable");
    }
  };

  useEffect(() => {
    recordCurrentPosition();
  }, []);

  return (
    <SearchProvider value={{ searchText, setSearchText }}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerTitle: () => (
              <TopBar
                searchText={searchText}
                setSearchText={setSearchText}
                onGeoPress={recordCurrentPosition}
              />
            ),
          }}
        />
      </Stack>
    </SearchProvider>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  searchContainer: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
  },
  geoButton: {
    marginLeft: SEARCH_TO_BUTTON_GAP,
    width: GEO_BUTTON_SIZE,
    height: GEO_BUTTON_SIZE,
    borderRadius: GEO_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
});
