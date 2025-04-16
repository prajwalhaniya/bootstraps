import { createBrowserRouter } from "react-router";
import Layout from "../app/dashboard";
import LoginPage from "../app/login";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import SampleApp from "@/app/plugins/sampleApp";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return children;
};

const GlobalErrorBoundary = () => {
    return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
            <Card className="max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Something went wrong</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">We're sorry, but we encountered an unexpected error.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <a href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Back to home
                        </a>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const router = createBrowserRouter([
    {
        path: "/",
        element: <Layout />,
        errorElement: <GlobalErrorBoundary />,
        children: [
            {
                path: "",
                element: (
                    <ProtectedRoute>
                        <SampleApp />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/sample-route",
                element: (
                    <ProtectedRoute>
                        <SampleApp />
                    </ProtectedRoute>
                ),
            }
        ],
    },
    {
        path: "login",
        element: <LoginPage />,
    },
]);

export default router;
