import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const ROLE_KEY = '@app_user_role';
const PROVIDER_STORAGE_KEY = '@metromatrix_provider_selection';

// Types
export type UserRole = 'provider' | 'user';
export type ProviderMainType = 'doctor' | 'home_service' | 'vendor' | null;
export type HomeServiceSubType = 'electrician' | 'plumber' | 'ac_repairer';

interface ProviderSelection {
  providerType: ProviderMainType;
  subTypes: HomeServiceSubType[];
}

/**
 * Service to manage user role persistence using AsyncStorage
 */
export const RoleStorage = {
  /**
   * Save user role preference to AsyncStorage
   */
  async saveRole(role: UserRole): Promise<void> {
    try {
      await AsyncStorage.setItem(ROLE_KEY, role);
      console.log(`💾 User role saved: ${role}`);
    } catch (error) {
      console.error('❌ Error saving user role:', error);
      throw error;
    }
  },

  /**
   * Get saved user role preference from AsyncStorage
   * Returns null if no role is saved
   */
  async getRole(): Promise<UserRole | null> {
    try {
      const role = await AsyncStorage.getItem(ROLE_KEY);
      
      if (!role) {
        console.log('ℹ️ No user role found in storage');
        return null;
      }
      
      console.log(`📥 User role loaded: ${role}`);
      return role as UserRole;
    } catch (error) {
      console.error('❌ Error getting user role:', error);
      return null;
    }
  },

  /**
   * Clear saved user role preference
   */
  async clearRole(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ROLE_KEY);
      console.log('🗑️ User role preference cleared');
    } catch (error) {
      console.error('❌ Error clearing user role:', error);
      throw error;
    }
  },
};

/**
 * Service to manage provider selection persistence using AsyncStorage
 */
export const ProviderStorage = {
  /**
   * Save provider selection to AsyncStorage
   */
  async saveSelection(providerType: ProviderMainType, subTypes: HomeServiceSubType[]): Promise<void> {
    try {
      const selection: ProviderSelection = {
        providerType,
        subTypes: providerType === 'home_service' ? subTypes : []
      };
      
      const data = JSON.stringify(selection);
      await AsyncStorage.setItem(PROVIDER_STORAGE_KEY, data);
      console.log('💾 Provider selection saved to storage:', selection);
    } catch (error) {
      console.error('❌ Failed to save provider selection:', error);
      throw error;
    }
  },

  /**
   * Load provider selection from AsyncStorage
   * Returns null if no selection is saved
   */
  async loadSelection(): Promise<ProviderSelection | null> {
    try {
      const data = await AsyncStorage.getItem(PROVIDER_STORAGE_KEY);
      
      if (!data) {
        console.log('ℹ️ No provider selection found in storage');
        return null;
      }
      
      const parsed = JSON.parse(data) as ProviderSelection;
      console.log('📥 Provider selection loaded from storage:', parsed);
      
      // Validate the data
      if (!parsed.providerType) {
        console.log('⚠️ Invalid provider selection data, clearing...');
        await this.clearSelection();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('❌ Failed to load provider selection:', error);
      return null;
    }
  },

  /**
   * Clear provider selection from AsyncStorage
   */
  async clearSelection(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROVIDER_STORAGE_KEY);
      console.log('🗑️ Provider selection cleared from storage');
    } catch (error) {
      console.error('❌ Failed to clear provider selection:', error);
      throw error;
    }
  },
};

/**
 * Combined storage service for clearing all app data
 */
export const AppStorage = {
  /**
   * Clear all app storage data (role and provider selection)
   */
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        RoleStorage.clearRole(),
        ProviderStorage.clearSelection(),
      ]);
      console.log('🗑️ All app storage cleared');
    } catch (error) {
      console.error('❌ Failed to clear all app storage:', error);
      throw error;
    }
  },

  /**
   * Get all app storage data
   */
  async getAll(): Promise<{
    role: UserRole | null;
    provider: ProviderSelection | null;
  }> {
    try {
      const [role, provider] = await Promise.all([
        RoleStorage.getRole(),
        ProviderStorage.loadSelection(),
      ]);
      return { role, provider };
    } catch (error) {
      console.error('❌ Failed to get all app storage:', error);
      return { role: null, provider: null };
    }
  },
};