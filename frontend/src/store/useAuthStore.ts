import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { ProfileSQL } from '../types/user';


interface AuthState {
    user: User | null;
    profile: ProfileSQL | null;
    loading: boolean;
    countryRank: number | null;
    setUser: (user: User | null) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signOut: () => Promise<void>;
    fetchCountryRank: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,
    countryRank: null,

    setUser: (user) => {
        set({ user, loading: !user });
    },


    fetchProfile: async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error fetching profile:", error.message);
        } else {
            console.log("Profile loaded:", data); // Check your browser console!
            set({ profile: data as ProfileSQL });
        }
    },

    fetchCountryRank: async () => {
        const profile = useAuthStore.getState().profile;
        if (!profile?.country || profile.elo === undefined) return;

        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('country', profile.country)
            .gt('elo', profile.elo);

        if (error) {
            console.error("Error fetching rank:", error.message);
            return;
        }

        set({ countryRank: (count ?? 0) + 1 });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));