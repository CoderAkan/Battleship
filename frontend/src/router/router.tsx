import { createBrowserRouter } from "react-router-dom";
import Layout from "../pages/DefaultPages/Layout";
import ErrorPage from "../pages/DefaultPages/ErrorPage";
import HomePage from "../pages/Non-DefaultPages/HomePage";
import { ProfilePage } from "../pages/Non-DefaultPages/ProfilePage";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <HomePage />
            },
            {
                path: 'profile',
                element: <ProfilePage />
            },
        ]
    }
]);