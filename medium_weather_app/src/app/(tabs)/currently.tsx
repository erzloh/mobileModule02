import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { useSearchContext } from "@/context/SearchContext";

type ForecastResponse = {
  current?: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

function weatherCodeToDescription(code: number) {
  const descriptionByCode: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptionByCode[code] ?? "Unknown";
}

export default function CurrentlyScreen() {
  const { selectedLocation, locationMessage } = useSearchContext();
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  const [weatherDescription, setWeatherDescription] = useState("");
  const [windSpeedKmh, setWindSpeedKmh] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {

    if (!selectedLocation) {
      setTemperatureC(null);
      setWeatherDescription("");
      setWindSpeedKmh(null);
			setErrorMessage(locationMessage ?? "Select a location to see the current weather.");
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage("");

    const fetchCurrentWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.latitude}&longitude=${selectedLocation.longitude}&current=temperature_2m,weather_code,wind_speed_10m`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          setErrorMessage("Failed to fetch weather.");
          return;
        }

        const data = (await response.json()) as ForecastResponse;
        if (!data.current) {
          setErrorMessage("No current weather available.");
          return;
        }

        setTemperatureC(data.current.temperature_2m);
        setWeatherDescription(weatherCodeToDescription(data.current.weather_code));
        setWindSpeedKmh(data.current.wind_speed_10m);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setErrorMessage("Failed to fetch weather.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCurrentWeather();

    return () => {
      controller.abort();
    };
  }, [selectedLocation, locationMessage]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        {!selectedLocation ? <Text style={styles.message}>{errorMessage}</Text> : null}

        {selectedLocation ? (
          <View style={styles.card}>
            <Text style={styles.locationText}>
              {selectedLocation.city}, {selectedLocation.region}, {selectedLocation.country}
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : errorMessage ? (
              <Text style={styles.message}>{errorMessage}</Text>
            ) : (
              <View style={styles.weatherInfo}>
                <Text style={styles.valueText}>Temperature: {temperatureC ?? "--"} °C</Text>
                <Text style={styles.valueText}>Weather: {weatherDescription}</Text>
                <Text style={styles.valueText}>Wind: {windSpeedKmh ?? "--"} km/h</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    padding: 16,
    gap: 12,
  },
  locationText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  weatherInfo: {
    gap: 8,
  },
  valueText: {
    fontSize: 16,
    color: "#1e293b",
  },
  message: {
    color: "#475569",
    fontSize: 15,
  },
});
