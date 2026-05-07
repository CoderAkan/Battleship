import { RouterProvider } from "react-router-dom"
import { router } from "./router/router"
function App() {
    return (
        // <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RouterProvider router={router} />
        // </GoogleOAuthProvider>
    )
}

export default App