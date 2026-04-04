// Qovshaq Phase 2A — Global filter state
import { createContext, useContext, useMemo, useReducer } from "react";
import { useAuth } from "../../utils/auth";

const QFilterContext = createContext(null);

const initialState = {
  location: { country: "", countryCode: "", city: "", region: "" },
  categories: [],
  tags: [],
  search: "",
  sortBy: "recent",
  timeRange: "all",
};

function filterReducer(state, action) {
  switch (action.type) {
    case "SET_LOCATION":
      return { ...state, location: action.payload };
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };
    case "TOGGLE_CATEGORY": {
      const cat = action.payload;
      const has = state.categories.includes(cat);
      return {
        ...state,
        categories: has
          ? state.categories.filter((c) => c !== cat)
          : [...state.categories, cat],
      };
    }
    case "SET_TAGS":
      return { ...state, tags: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_SORT":
      return { ...state, sortBy: action.payload };
    case "SET_TIME_RANGE":
      return { ...state, timeRange: action.payload };
    case "RESET":
      return { ...initialState, location: state.location };
    case "INIT_LOCATION":
      return { ...state, location: action.payload };
    default:
      return state;
  }
}

export function QFilterProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(filterReducer, {
    ...initialState,
    location: user?.qLocation?.city
      ? {
          country: user.qLocation.country || "",
          countryCode: user.qLocation.countryCode || "",
          city: user.qLocation.city || "",
          region: user.qLocation.region || "",
        }
      : initialState.location,
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (state.categories.length) count++;
    if (state.tags.length) count++;
    if (state.search) count++;
    if (state.timeRange !== "all") count++;
    if (state.sortBy !== "recent") count++;
    return count;
  }, [state]);

  const value = useMemo(
    () => ({ filters: state, dispatch, activeFilterCount }),
    [state, activeFilterCount]
  );

  return (
    <QFilterContext.Provider value={value}>{children}</QFilterContext.Provider>
  );
}

export function useQFilterContext() {
  const ctx = useContext(QFilterContext);
  if (!ctx) throw new Error("useQFilterContext must be inside QFilterProvider");
  return ctx;
}
