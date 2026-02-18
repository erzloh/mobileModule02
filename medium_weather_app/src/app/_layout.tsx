import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { SearchProvider, type SelectedLocation } from "@/context/SearchContext";

const GEO_BUTTON_SIZE = 36;
const SEARCH_TO_BUTTON_GAP = 12;
const SEARCH_CONTAINER_HEIGHT = 38;
const SUGGESTIONS_TOP_OFFSET = 4;
const SUGGESTIONS_TOP = SEARCH_CONTAINER_HEIGHT + SUGGESTIONS_TOP_OFFSET;
const SUGGESTIONS_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;
const SUGGESTIONS_DEBOUNCE_MS = 250;

type OpenMeteoGeocodingResult = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
};

function formatSuggestionLabel(result: OpenMeteoGeocodingResult) {
  const parts = [result.name, result.admin1, result.country].filter(
    (value): value is string => Boolean(value),
  );
  return parts.join(", ");
}

function formatLocationLabel(location: SelectedLocation) {
  return `${location.city}, ${location.region}, ${location.country}`;
}

function TopBar({
  searchText,
  setSearchText,
  setSelectedLocation,
  setLocationMessage,
  onGeoPress,
  isGeoLoading,
}: {
  searchText: string;
  setSearchText: (value: string) => void;
  setSelectedLocation: (value: SelectedLocation | null) => void;
  setLocationMessage: (value: string | null) => void;
  onGeoPress: () => void;
  isGeoLoading: boolean;
}) {
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<OpenMeteoGeocodingResult[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      setIsSuggestionsVisible(false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const query = searchText.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSuggestionsLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query,
        )}&count=${SUGGESTIONS_LIMIT}&format=json`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as OpenMeteoGeocodingResponse;
        setSuggestions(data.results ?? []);
		
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSuggestions([]);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }, SUGGESTIONS_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  const selectSuggestion = (result: OpenMeteoGeocodingResult) => {
    const location: SelectedLocation = {
      city: result.name,
      region: result.admin1 ?? "Unknown region",
      country: result.country ?? "Unknown country",
      latitude: result.latitude,
      longitude: result.longitude,
    };
    setSelectedLocation(location);
    setLocationMessage(null);
    setSearchText("");
    setIsSuggestionsVisible(false);
		Keyboard.dismiss();
  };

  return (
      <View style={styles.topBar}>
        <View style={styles.searchArea}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={18} color="#64748b" />
            <TextInput
              placeholder="Search city"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchText}
              onChangeText={(value) => {
                setSearchText(value);
                setIsSuggestionsVisible(value.trim().length > 0);
              }}
              onFocus={() => setIsSuggestionsVisible(searchText.trim().length > 0)}
              onSubmitEditing={() => setIsSuggestionsVisible(false)}
            />
          </View>
          {isSuggestionsVisible && (isSuggestionsLoading || suggestions.length > 0) ? (
            <View style={styles.suggestionsContainer}>
              {isSuggestionsLoading ? (
                <View style={styles.loadingItem}>
                  <ActivityIndicator size="small" color="#64748b" />
                  <Text style={styles.loadingText}>Loading suggestions...</Text>
                </View>
              ) : (
                suggestions.map((result) => (
                  <Pressable
                    key={`${result.id}-${result.name}`}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(result)}
                  >
                    <Text style={styles.suggestionText}>{formatSuggestionLabel(result)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </View>
        <Pressable style={styles.geoButton} onPress={onGeoPress} disabled={isGeoLoading}>
          {isGeoLoading ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0f172a" />
          )}
        </Pressable>
      </View>
  );
}

export default function RootLayout() {
  const [searchText, setSearchText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isGeoLoading, setIsGeoLoading] = useState(false);

  const recordCurrentPosition = async () => {
    setIsGeoLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      setSelectedLocation(null);
      setLocationMessage("Location permission denied. Please allow location access.");
      setIsGeoLoading(false);
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [reverseResult] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const location: SelectedLocation = {
        city: reverseResult?.city ?? "Current location",
        region: reverseResult?.region ?? "Unknown region",
        country: reverseResult?.country ?? "Unknown country",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setSelectedLocation(location);
      setLocationMessage(null);
			setSearchText("");
    } catch {
      setSelectedLocation(null);
      setLocationMessage("Unable to get your location.");
    } finally {
      setIsGeoLoading(false);
    }
  };

  useEffect(() => {
    recordCurrentPosition();
  }, []);

  return (
    <SearchProvider
      value={{
        searchText,
        setSearchText,
        selectedLocation,
        setSelectedLocation,
        locationMessage,
        setLocationMessage,
      }}
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            header: () => (
              <View style={styles.headerContainer}>
                <TopBar
                  searchText={searchText}
                  setSearchText={setSearchText}
                  setSelectedLocation={setSelectedLocation}
                  setLocationMessage={setLocationMessage}
                  onGeoPress={recordCurrentPosition}
                  isGeoLoading={isGeoLoading}
                />
              </View>
            ),
          }}
        />
      </Stack>
    </SearchProvider>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  searchArea: {
    flex: 1,
    position: "relative",
  },
  searchContainer: {
    height: SEARCH_CONTAINER_HEIGHT,
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
  suggestionsContainer: {
    position: "absolute",
    top: SUGGESTIONS_TOP,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    zIndex: 10,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  suggestionText: {
    color: "#0f172a",
    fontSize: 14,
  },
  loadingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 13,
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
