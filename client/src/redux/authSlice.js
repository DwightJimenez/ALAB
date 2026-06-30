import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// New thunk to check if the session cookie is valid
export const verifyUser = createAsyncThunk('auth/verify', async () => {
  const response = await fetch('http://localhost:5000/api/verify', {
    credentials: 'include', // Crucial: tells browser to send the httpOnly cookie
  });
  if (!response.ok) throw new Error('Not logged in');
  const data = await response.json();
  return data.user;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, isAuthenticated: false, isLoading: true },
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(verifyUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.isLoading = false;
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;