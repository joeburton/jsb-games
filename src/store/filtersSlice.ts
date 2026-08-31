import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type VisibilityFilter = "all" | "active" | "completed";

export interface FiltersState {
  visibilityFilter: VisibilityFilter;
}

const initialState: FiltersState = {
  visibilityFilter: "all",
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setVisibilityFilter: (state, action: PayloadAction<VisibilityFilter>) => {
      state.visibilityFilter = action.payload;
    },
  },
});

export const { setVisibilityFilter } = filtersSlice.actions;
export default filtersSlice.reducer;
