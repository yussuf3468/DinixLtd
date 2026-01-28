import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import ClientList from "./components/ClientList";
import ClientDetail from "./components/ClientDetail";
import Reports from "./components/Reports";
import Debts from "./components/Debts";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import { offlineDB } from "./lib/offlineDB";

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
        {renderPage()}
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
