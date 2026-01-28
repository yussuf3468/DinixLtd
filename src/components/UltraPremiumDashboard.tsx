import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { offlineSupabase } from "../lib/offlineSupabase";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  Users,
  TrendingUp,
  DollarSign,
  Plus,
  Search,
  Eye,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X,
} from "lucide-react";
import { formatCurrency } from "../lib/currency";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalVehicles: number;
  revenueKES: number;
  revenueUSD: number;
  pendingKES: number;
  pendingUSD: number;
}

interface ClientWithBalance {
  id: string;
  client_name: string;
  client_code: string;
  status: string;
  created_at: string;
  balance_kes: number;
  balance_usd: number;
  transaction_count: number;
  last_transaction_date: string | null;
}

interface DashboardProps {
  onNavigate: (page: string, clientId?: string) => void;
}

export default function UltraPremiumDashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    totalVehicles: 0,
    revenueKES: 0,
    revenueUSD: 0,
    pendingKES: 0,
    pendingUSD: 0,
  });
  const [clientsWithBalance, setClientsWithBalance] = useState<
    ClientWithBalance[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quickAddCurrency, setQuickAddCurrency] = useState<"KES" | "USD">(
    "KES"
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load clients with balances
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id);

      if (clientsError) throw clientsError;

      // Load transactions for both currencies
      const [kesTransactions, usdTransactions] = await Promise.all([
        supabase
          .from("client_transactions_kes")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("client_transactions_usd")
          .select("*")
          .eq("user_id", user.id),
      ]);

      // Calculate balances per client
      const clientBalances =
        clients?.map((client) => {
          const kesClientTrans =
            kesTransactions.data?.filter((t) => t.client_id === client.id) ||
            [];
          const usdClientTrans =
            usdTransactions.data?.filter((t) => t.client_id === client.id) ||
            [];

          const balanceKes = kesClientTrans.reduce(
            (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
            0
          );
          const balanceUsd = usdClientTrans.reduce(
            (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
            0
          );

          const allTransactions = [...kesClientTrans, ...usdClientTrans];
          const lastTransaction = allTransactions.sort(
            (a, b) =>
              new Date(b.transaction_date).getTime() -
              new Date(a.transaction_date).getTime()
          )[0];

          return {
            ...client,
            balance_kes: balanceKes,
            balance_usd: balanceUsd,
            transaction_count: allTransactions.length,
            last_transaction_date: lastTransaction?.transaction_date || null,
          };
        }) || [];

      setClientsWithBalance(clientBalances);

      // Calculate stats
      const totalKes =
        kesTransactions.data?.reduce(
          (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
          0
        ) || 0;
      const totalUsd =
        usdTransactions.data?.reduce(
          (sum, t) => sum + (t.debit || 0) - (t.credit || 0),
          0
        ) || 0;

      setStats({
        totalClients: clients?.length || 0,
        activeClients:
          clients?.filter((c) => c.status === "active").length || 0,
        totalVehicles: 0,
        revenueKES: totalKes,
        revenueUSD: totalUsd,
        pendingKES: 0,
        pendingUSD: 0,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const handleQuickAddTransaction = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedClientId) {
      toast.warning("Please select a client");
      return;
    }

    try {
      toast.info("Adding transaction...");
      const table =
        quickAddCurrency === "KES"
          ? "client_transactions_kes"
          : "client_transactions_usd";

      const transactionData = {
        user_id: user?.id,
        client_id: selectedClientId,
        transaction_date: formData.get("transaction_date"),
        description: formData.get("description"),
        debit:
          formData.get("type") === "receivable"
            ? Number(formData.get("amount"))
            : 0,
        credit:
          formData.get("type") === "paid" ? Number(formData.get("amount")) : 0,
        payment_method: formData.get("payment_method"),
        reference_number: formData.get("reference_number") || null,
        notes: formData.get("notes") || null,
      };

      const result = await offlineSupabase.insert(table, transactionData);

      if (result.error) throw result.error;

      setShowQuickAddModal(false);
      e.currentTarget.reset();
      setSelectedClientId("");
      loadDashboardData();

      if (result.offline) {
        toast.success("Transaction queued (offline). Will sync when online.");
      } else {
        toast.success("Transaction added successfully!");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error(
        `Failed to add transaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clientsWithBalance;

    const term = searchTerm.toLowerCase();
    return clientsWithBalance.filter(
      (client) =>
        client.client_name.toLowerCase().includes(term) ||
        client.client_code.toLowerCase().includes(term)
    );
  }, [clientsWithBalance, searchTerm]);

  const topClients = useMemo(() => {
    return [...filteredClients]
      .filter((c) => c.status === "active")
      .sort((a, b) => {
        if (a.last_transaction_date && b.last_transaction_date) {
          return (
            new Date(b.last_transaction_date).getTime() -
            new Date(a.last_transaction_date).getTime()
          );
        }
        return b.transaction_count - a.transaction_count;
      })
      .slice(0, 12);
  }, [filteredClients]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-500 animate-pulse" />
        </div>
        <p className="mt-6 text-gray-400 font-medium">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 pb-12">
      {/* ULTRA PREMIUM HEADER */}
      <div className="bg-black/40 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white via-emerald-200 to-teal-200 bg-clip-text text-transparent">
                  Client Dashboard
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Enterprise Financial Management
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowQuickAddModal(true)}
              className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-4 rounded-xl font-bold text-white shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span>Record Transaction</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* PREMIUM STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Clients */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-500/50 transition-all duration-500 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">
                Total Clients
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {stats.totalClients}
              </p>
            </div>
          </div>

          {/* Active Clients */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-all duration-500 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-7 h-7 text-white animate-pulse" />
                </div>
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">
                Active Now
              </p>
              <p className="text-4xl font-black bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                {stats.activeClients}
              </p>
            </div>
          </div>
        </div>

        {/* CLIENTS SECTION */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Active Clients
              </h2>
              <p className="text-sm text-gray-400">
                Your top clients by recent activity
              </p>
            </div>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topClients.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-medium mb-2">
                  No clients yet
                </p>
                <p className="text-gray-500 text-sm">
                  Add your first client to get started
                </p>
              </div>
            ) : (
              topClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => onNavigate("client-detail", client.id)}
                  className="group relative bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">
                        {client.client_name}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {client.client_code}
                      </p>
                    </div>
                    <Eye className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">KES Balance</span>
                      <span
                        className={`font-bold text-sm ${
                          client.balance_kes >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {client.balance_kes >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 inline" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 inline" />
                        )}
                        {formatCurrency(Math.abs(client.balance_kes), "KES")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">USD Balance</span>
                      <span
                        className={`font-bold text-sm ${
                          client.balance_usd >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {client.balance_usd >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 inline" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 inline" />
                        )}
                        {formatCurrency(Math.abs(client.balance_usd), "USD")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {client.last_transaction_date
                          ? new Date(
                              client.last_transaction_date
                            ).toLocaleDateString()
                          : "No transactions"}
                      </span>
                    </div>
                    <span className="bg-white/10 px-2 py-1 rounded-full">
                      {client.transaction_count} txns
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {topClients.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => onNavigate("clients")}
                className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm transition-colors"
              >
                View All Clients →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PREMIUM QUICK ADD MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Record Transaction
              </h2>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={handleQuickAddTransaction}
              className="p-6 space-y-6"
            >
              {/* Client Selection */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Select Client *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  <option value="" className="bg-gray-900">
                    Choose a client...
                  </option>
                  {clientsWithBalance.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                      className="bg-gray-900"
                    >
                      {client.client_name} ({client.client_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Toggle */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Currency
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddCurrency("KES")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      quickAddCurrency === "KES"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                  >
                    KES
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAddCurrency("USD")}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      quickAddCurrency === "USD"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Transaction Type *
                </label>
                <select
                  name="type"
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="receivable" className="bg-gray-900">
                    💰 Money IN (Client Brought Money)
                  </option>
                  <option value="paid" className="bg-gray-900">
                    💸 Money OUT (Client Took Money)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="transaction_date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="What was this transaction for?"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Payment Method *
                </label>
                <select
                  name="payment_method"
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash" className="bg-gray-900">
                    Cash
                  </option>
                  <option value="mpesa" className="bg-gray-900">
                    M-Pesa
                  </option>
                  <option value="bank_transfer" className="bg-gray-900">
                    Bank Transfer
                  </option>
                  <option value="cheque" className="bg-gray-900">
                    Cheque
                  </option>
                  <option value="card" className="bg-gray-900">
                    Card
                  </option>
                  <option value="other" className="bg-gray-900">
                    Other
                  </option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105"
              >
                Record Transaction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
