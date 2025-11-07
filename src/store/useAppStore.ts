import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassificationResult, HistoryItem } from '../models/ClassificationResult';

interface AppState {
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
  
  // History
  history: HistoryItem[];
  addToHistory: (result: ClassificationResult) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  updateHistoryItem: (id: string, updates: Partial<HistoryItem>) => void;
  
  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => void;
  
  // Settings
  settings: {
    autoSave: boolean;
    locationTracking: boolean;
    notifications: boolean;
    modelVersion: string;
    confidenceThreshold: number;
  };
  updateSettings: (updates: Partial<AppState['settings']>) => void;
  
  // Current scan
  currentScan: ClassificationResult | null;
  setCurrentScan: (result: ClassificationResult | null) => void;
  
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      isDarkMode: false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      // History
      history: [],
      addToHistory: (result: ClassificationResult) => {
        const historyItem: HistoryItem = {
          id: result.id,
          imageUri: result.imageUri,
          timestamp: result.timestamp,
          result,
          isFavorite: false,
        };
        set((state) => ({
          history: [historyItem, ...state.history],
        }));
      },
      removeFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
      },
      clearHistory: () => set({ history: [] }),
      updateHistoryItem: (id: string, updates: Partial<HistoryItem>) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },
      
      // Favorites
      favorites: [],
      toggleFavorite: (id: string) => {
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((favId) => favId !== id)
            : [...state.favorites, id],
        }));
      },
      
      // Settings
      settings: {
        autoSave: true,
        locationTracking: true,
        notifications: true,
        modelVersion: 'leaf-1.0.0',
        confidenceThreshold: 0.3,
      },
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },
      
      // Current scan
      currentScan: null,
      setCurrentScan: (result) => set({ currentScan: result }),
      
      // Loading states
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Error handling
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'leaf-disease-detector-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        history: state.history,
        favorites: state.favorites,
        settings: state.settings,
      }),
    }
  )
);
