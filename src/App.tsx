import { useState, useEffect, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import { offlineDB } from "./lib/offlineDB";

const ClientList = lazy(() => import("./components/ClientList"));
const ClientDetail = lazy(() => import("./components/ClientDetail"));
const Reports = lazy(() => import("./components/Reports"));
const Debts = lazy(() => import("./components/Debts"));

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("clients");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Initialize offline database
  useEffect(() => {
    offlineDB.init().catch(console.error);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration);
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });
    }
  }, []);

  // Always scroll to top when navigating between pages or clients
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [currentPage, selectedClientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage("client-detail");
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setCurrentPage("clients");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "clients":
        return <ClientList onSelectClient={handleSelectClient} />;
      case "client-detail":
        return selectedClientId ? (
          <ClientDetail
            clientId={selectedClientId}
            onBack={handleBackToClients}
          />
        ) : (
          <ClientList onSelectClient={handleSelectClient} />
        );
      case "debts":
        return <Debts />;
      case "reports":
        return <Reports />;
      default:
        return <ClientList onSelectClient={handleSelectClient} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center text-gray-600 text-sm">
              Loading...
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      </Layout>
      <OfflineIndicator />
      <InstallPrompt />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
