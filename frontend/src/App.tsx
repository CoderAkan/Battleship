import { useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "./router/router"
import { supabase } from "./lib/supabase"
import { useAuthStore } from "./store/useAuthStore"

function App() {
    const { setUser, fetchProfile, setAccessToken } = useAuthStore()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user ?? null;
            setUser(user);
            setAccessToken(session?.access_token ?? null);
            if (user) fetchProfile(user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user ?? null;
            setUser(user);
            setAccessToken(session?.access_token ?? null);
            if (user) fetchProfile(user.id);
        });

        return () => subscription.unsubscribe();
    }, [setUser, fetchProfile, setAccessToken]);

    return (
        <RouterProvider router={router} />
    )
}

export default App