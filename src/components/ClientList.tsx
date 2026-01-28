import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Users,
  Filter,
  X,
  ArrowUpDown,
  Phone,
  Calendar,
  Eye,
  Trash2,
  DollarSign,
  Clock,
  Ban,
  CheckCircle,
} from "lucide-react";

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  status: string;
  last_transaction_date: string | null;
  created_at: string;
}

interface ClientBalance {
  client_id: string;
  balance: number;
  transaction_count: number;
  kes_balance: number;
  usd_balance: number;
  kes_count: number;
  usd_count: number;
}

interface ClientListProps {
  onSelectClient: (clientId: string) => void;
}

type SortField = "name" | "date" | "balance" | "transactions";
type SortOrder = "asc" | "desc";

export default function ClientList({ onSelectClient }: ClientListProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [balances, setBalances] = useState<Map<string, ClientBalance>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [totalBalances, setTotalBalances] = useState({
    totalKES: 0,
    totalUSD: 0,
  });

  useEffect(() => {
    if (user) {
      loadClients();
      loadBalances();
    }
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, client_name, client_code, email, phone, business_name, status, last_transaction_date, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClients(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter((c) => c.status === "active").length || 0;
      const inactive = data?.filter((c) => c.status === "inactive").length || 0;
      setStats({ total, active, inactive });
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!user) return;

    try {
      // Load KES transactions
      const { data: kesData, error: kesError } = await supabase
        .from("client_transactions_kes")
        .select("client_id, credit, debit")
        .eq("user_id", user.id);

      if (kesError) throw kesError;

      // Load USD transactions
      const { data: usdData, error: usdError } = await supabase
        .from("client_transactions_usd")
        .select("client_id, credit, debit")
        .eq("user_id", user.id);

      if (usdError) throw usdError;

      // Calculate balances by client (track KES and USD separately)
      const balanceMap = new Map<string, ClientBalance>();

      // Process KES transactions
      kesData?.forEach((txn) => {
        const existing = balanceMap.get(txn.client_id) || {
          client_id: txn.client_id,
          balance: 0,
          transaction_count: 0,
          kes_balance: 0,
          usd_balance: 0,
          kes_count: 0,
          usd_count: 0,
        };
        const amount = (txn.credit || 0) - (txn.debit || 0);
        existing.kes_balance += amount;
        existing.balance += amount; // Combined balance in KES
        existing.kes_count += 1;
        existing.transaction_count += 1;
        balanceMap.set(txn.client_id, existing);
      });

      // Process USD transactions
      usdData?.forEach((txn) => {
        const existing = balanceMap.get(txn.client_id) || {
          client_id: txn.client_id,
          balance: 0,
          transaction_count: 0,
          kes_balance: 0,
          usd_balance: 0,
          kes_count: 0,
          usd_count: 0,
        };
        const amount = (txn.credit || 0) - (txn.debit || 0);
        existing.usd_balance += amount;
        existing.balance += amount * 150; // Convert to KES for combined balance
        existing.usd_count += 1;
        existing.transaction_count += 1;
        balanceMap.set(txn.client_id, existing);
      });

      setBalances(balanceMap);

      // Calculate total balances
      let totalKES = 0;
      let totalUSD = 0;
      balanceMap.forEach((balance) => {
        totalKES += balance.kes_balance;
        totalUSD += balance.usd_balance;
      });
      setTotalBalances({ totalKES, totalUSD });
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };

  // Memoized filtered and sorted clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.client_name.toLowerCase().includes(term) ||
          c.client_code.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term) ||
          c.business_name?.toLowerCase().includes(term),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "name":
          compareValue = a.client_name.localeCompare(b.client_name);
          break;
        case "date":
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "balance":
          const balanceA = balances.get(a.id)?.balance || 0;
          const balanceB = balances.get(b.id)?.balance || 0;
          compareValue = balanceA - balanceB;
          break;
        case "transactions":
          const txnA = balances.get(a.id)?.transaction_count || 0;
          const txnB = balances.get(b.id)?.transaction_count || 0;
          compareValue = txnA - txnB;
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [clients, searchTerm, statusFilter, sortField, sortOrder, balances]);

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      // Generate unique client code using timestamp and random number
      const generateUniqueClientCode = () => {
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        const random = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        return `CLT-${timestamp}${random}`;
      };

      let clientCode = generateUniqueClientCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Check if code exists and regenerate if needed
      while (attempts < maxAttempts) {
        const { data: existing, error: checkError } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user?.id)
          .eq("client_code", clientCode)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking client code:", checkError);
          toast.error("Failed to generate client code. Please try again.");
          return;
        }

        // If no existing client with this code, we're good
        if (!existing) {
          break;
        }

        // Generate a new code and try again
        clientCode = generateUniqueClientCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        toast.error("Failed to generate unique client code. Please try again.");
        return;
      }

      const { data: newClient, error: insertError } = await supabase
        .from("clients")
        .insert({
          user_id: user?.id,
          client_name: formData.get("client_name"),
          email: formData.get("email") || null,
          phone: formData.get("phone") || null,
          business_name: formData.get("business_name") || null,
          address: formData.get("address") || null,
          client_code: clientCode,
          status: "active",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error adding client:", insertError);
        toast.error("Failed to add client. Please try again.");
        return;
      }

      // Create opening balance transaction if initial balance is provided
      const initialBalanceStr = formData.get("initial_balance") as string;
      const initialBalance = initialBalanceStr
        ? parseFloat(initialBalanceStr)
        : 0;
      const initialCurrency = formData.get("initial_currency") as string;

      if (!isNaN(initialBalance) && initialBalance > 0 && newClient) {
        const transactionTable =
          initialCurrency === "USD"
            ? "client_transactions_usd"
            : "client_transactions_kes";

        const { error: transactionError } = await supabase
          .from(transactionTable)
          .insert({
            client_id: newClient.id,
            user_id: user?.id,
            transaction_date: new Date().toISOString().split("T")[0],
            description: "Opening Balance",
            credit: initialBalance,
            debit: 0,
          });

        if (transactionError) {
          console.error("Error creating opening balance:", transactionError);
          toast.warning(
            "Client added but opening balance failed. Please add it manually.",
          );
        }
      }

      // Success - close modal and reload
      form.reset();
      setShowAddModal(false);

      // Reload both clients and balances with proper error handling
      try {
        await Promise.all([loadClients(), loadBalances()]);
        toast.success(`✓ Client ${clientCode} added successfully!`);
      } catch (reloadError) {
        console.error("Error reloading after client creation:", reloadError);
        toast.success(
          `✓ Client ${clientCode} added. Please refresh to see updates.`,
        );
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      // Delete client transactions first
      const { error: kesError } = await supabase
        .from("client_transactions_kes")
        .delete()
        .eq("client_id", clientToDelete.id)
        .eq("user_id", user?.id);

      if (kesError) throw kesError;

      const { error: usdError } = await supabase
        .from("client_transactions_usd")
        .delete()
        .eq("client_id", clientToDelete.id)
        .eq("user_id", user?.id);

      if (usdError) throw usdError;

      // Delete client
      const { error: clientError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id)
        .eq("user_id", user?.id);

      if (clientError) throw clientError;

      toast.success(
        `✓ Client ${clientToDelete.client_code} deleted successfully!`,
      );
      setClientToDelete(null);
      await Promise.all([loadClients(), loadBalances()]);
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast.error(`✗ Failed to delete client: ${error.message}`);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    const newStatus = client.status === "active" ? "inactive" : "active";

    try {
      const { error } = await supabase
        .from("clients")
        .update({ status: newStatus })
        .eq("id", client.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success(`✓ Client ${client.client_code} marked as ${newStatus}!`);
      await loadClients();
    } catch (error: any) {
      console.error("Error updating client status:", error);
      toast.error(`✗ Failed to update status: ${error.message}`);
    }
  };

  const LoadingSkeleton = () => (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="h-4 w-24 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="bg-white/90 backdrop-blur-xl rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white/90 backdrop-blur-xl rounded-xl p-6 shadow-sm border border-gray-200"
          >
            <div className="h-6 w-32 bg-gray-200 rounded mb-3 animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-3 sm:p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-sm sm:text-lg">
                  D
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-500" />
                Client Management
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 ml-10 sm:ml-13">
              Manage and track all your clients • Dinix
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-200 font-bold text-sm sm:text-base w-full sm:w-auto justify-center active:scale-95"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add Client
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:gap-6 mb-4 sm:mb-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-gray-200 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">
                  Total Clients
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 xl:gap-6 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-emerald-500/20 hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">
                  Total Balance (KES)
                </p>
                <p
                  className={`text-2xl sm:text-3xl font-bold ${
                    totalBalances.totalKES >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  KES {totalBalances.totalKES.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-blue-500/20 hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">
                  Total Balance (USD)
                </p>
                <p
                  className={`text-2xl sm:text-3xl font-bold ${
                    totalBalances.totalUSD >= 0
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  USD {totalBalances.totalUSD.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filters, and Sort */}
        <div className="bg-white/90 backdrop-blur-xl rounded-xl p-3 sm:p-4 border border-gray-200 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-col md:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search clients by name, code, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-gray-900 placeholder-gray-500 hover:border-gray-300 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortField(field as SortField);
                  setSortOrder(order as SortOrder);
                }}
                className="flex-1 md:flex-none px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 font-semibold hover:border-gray-300 transition-all"
              >
                <option value="date-desc" className="bg-white text-gray-900">
                  Newest First
                </option>
                <option value="date-asc" className="bg-white text-gray-900">
                  Oldest First
                </option>
                <option value="name-asc" className="bg-white text-gray-900">
                  Name (A-Z)
                </option>
                <option value="name-desc" className="bg-white text-gray-900">
                  Name (Z-A)
                </option>
                <option value="balance-desc" className="bg-white text-gray-900">
                  Highest Balance
                </option>
                <option value="balance-asc" className="bg-white text-gray-900">
                  Lowest Balance
                </option>
                <option
                  value="transactions-desc"
                  className="bg-white text-gray-900"
                >
                  Most Transactions
                </option>
                <option
                  value="transactions-asc"
                  className="bg-white text-gray-900"
                >
                  Least Transactions
                </option>
              </select>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                statusFilter === "all"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border-2 border-emerald-400/50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                statusFilter === "active"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg border-2 border-emerald-400/50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300"
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                statusFilter === "inactive"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg border-2 border-gray-400/50"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300"
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredClients.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">
              {clients.length}
            </span>{" "}
            clients
          </div>
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center shadow-sm border border-gray-200">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {searchTerm || statusFilter !== "all"
              ? "No clients found"
              : "No clients yet"}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filters to find what you're looking for"
              : "Start building your client database by adding your first client"}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-xl transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredClients.map((client) => {
            const clientBalance = balances.get(client.id);
            const balance = clientBalance?.balance || 0;
            const txnCount = clientBalance?.transaction_count || 0;
            const isPositive = balance > 0;
            const isNegative = balance < 0;

            return (
              <div
                key={client.id}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Header */}
                <div
                  className={`h-2 bg-gradient-to-r ${
                    client.status === "active"
                      ? "from-emerald-400 via-teal-400 to-cyan-400"
                      : "from-gray-300 via-gray-400 to-gray-500"
                  }`}
                ></div>

                <div className="p-5">
                  {/* Client Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md bg-gradient-to-br ${
                          client.status === "active"
                            ? "from-emerald-500 to-teal-600"
                            : "from-gray-400 to-gray-600"
                        }`}
                      >
                        {client.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                          {client.client_name}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">
                          {client.client_code}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 mb-3">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Balance & Transactions */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div
                      className={`rounded-lg p-2.5 ${
                        isPositive
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : isNegative
                            ? "bg-red-500/10 border border-red-500/20"
                            : "bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign
                          className={`w-3.5 h-3.5 ${
                            isPositive
                              ? "text-emerald-600"
                              : isNegative
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                        />
                        <span className="text-xs text-gray-600 font-medium">
                          Balance
                        </span>
                      </div>
                      <p
                        className={`text-sm font-bold ${
                          isPositive
                            ? "text-emerald-600"
                            : isNegative
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {clientBalance?.kes_balance &&
                        clientBalance.kes_balance !== 0
                          ? `KES ${clientBalance.kes_balance.toLocaleString()}`
                          : clientBalance?.usd_count
                            ? `USD ${clientBalance.usd_balance.toLocaleString()}`
                            : `KES 0`}
                      </p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs text-gray-600 font-medium">
                          Txns
                        </span>
                      </div>
                      <p className="text-sm font-bold text-blue-600">
                        {txnCount}
                      </p>
                    </div>
                  </div>

                  {/* Last Transaction */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {client.last_transaction_date
                        ? new Date(
                            client.last_transaction_date,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No transactions"}
                    </span>
                  </div>

                  {/* Quick Actions */}
                  <div className="pt-3 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-medium hover:shadow-lg transition-all duration-200 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handleToggleStatus(client)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                        client.status === "active"
                          ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/30"
                          : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/30"
                      }`}
                      title={
                        client.status === "active"
                          ? "Mark Inactive"
                          : "Mark Active"
                      }
                    >
                      {client.status === "active" ? (
                        <Ban className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setClientToDelete(client)}
                      className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-600 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-all duration-200 active:scale-95"
                      title="Delete Client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scaleIn">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 border-b border-emerald-500/30 px-6 py-5 flex items-center justify-between shadow-lg">
              <h2 className="text-2xl font-black text-white">Add New Client</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client_name"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 placeholder-gray-500 hover:border-gray-300 transition-all font-medium"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 placeholder-gray-500 hover:border-gray-300 transition-all font-medium"
                  placeholder="+254 700 000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Initial Balance (Optional)
                  </label>
                  <input
                    type="number"
                    name="initial_balance"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 placeholder-gray-500 hover:border-gray-300 transition-all font-medium"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">
                    Currency
                  </label>
                  <select
                    name="initial_currency"
                    defaultValue="KES"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 hover:border-gray-300 transition-all font-medium"
                  >
                    <option value="KES" className="bg-white text-gray-900">
                      KES
                    </option>
                    <option value="USD" className="bg-white text-gray-900">
                      USD
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-200 active:scale-95"
                >
                  ✓ Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-md w-full border border-red-500/20 animate-scaleIn">
            <div className="bg-gradient-to-r from-red-600 to-red-700 border-b border-red-500/30 px-6 py-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Delete Client</h2>
              <button
                onClick={() => setClientToDelete(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-900 font-bold">
                    {clientToDelete.client_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {clientToDelete.client_code}
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this client? This will also
                delete all associated transactions. This action cannot be
                undone.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteClient}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-200 active:scale-95"
                >
                  ✓ Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
