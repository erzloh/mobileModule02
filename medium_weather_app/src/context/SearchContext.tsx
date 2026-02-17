import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type SearchContextValue = {
  searchText: string;
  setSearchText: (value: string) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({
  value,
  children,
}: {
  value: SearchContextValue;
  children: ReactNode;
}) {
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error("useSearchContext must be used inside SearchProvider");
  }

  return context;
}
