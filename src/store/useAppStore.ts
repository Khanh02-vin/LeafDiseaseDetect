import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassificationResult, HistoryItem } from '../models/ClassificationResult';
import { Logger, LogCategory } from '../utils/Logger';

const OLD_STORAGE_KEY = 'orange-quality-checker-storage';
const NEW_STORAGE_KEY = 'leaf-disease-checker-storage';

let migrationPromise: Promise<void> | null = null;

async function migrateStorage(): Promise<void> {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    try {
      const oldData = await AsyncStorage.getItem(OLD_STORAGE_KEY);
      if (oldData) {
        const newData = await AsyncStorage.getItem(NEW_STORAGE_KEY);
        if (!newData) {
          Logger.info(LogCategory.STORAGE, 'Migrating storage from old key to new key');
          await AsyncStorage.setItem(NEW_STORAGE_KEY, oldData);
          Logger.success(LogCategory.STORAGE, 'Successfully migrated storage data');
        } else {
          Logger.info(LogCategory.STORAGE, 'New storage key already has data, skipping migration');
        }
        await AsyncStorage.removeItem(OLD_STORAGE_KEY);
        Logger.info(LogCategory.STORAGE, 'Removed old storage key');
      }
    } catch (error) {
      Logger.error(LogCategory.STORAGE, 'Error migrating storage, will retry on next operation', error);
      migrationPromise = null;
    }
  })();

  return migrationPromise;
}

const storageWithMigration = {
  getItem: async (name: string) => {
    await migrateStorage();
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string) => {
    await migrateStorage();
    return AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await migrateStorage();
    return AsyncStorage.removeItem(name);
  },
};

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
    adaptiveThreshold: boolean;
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
        modelVersion: '1.0.0',
        confidenceThreshold: 0.6,
        adaptiveThreshold: true,
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
      name: NEW_STORAGE_KEY,
      storage: createJSONStorage(() => storageWithMigration),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        history: state.history,
        favorites: state.favorites,
        settings: state.settings,
      }),
    }
  )
);
