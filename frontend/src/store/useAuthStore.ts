import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { ProfileSQL } from '../types/user';


interface AuthState {
    user: User | null;
    profile: ProfileSQL | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,

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

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));