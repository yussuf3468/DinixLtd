import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  Trash2,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "../lib/currency";
import Modal from "./Modal";

interface DebtWithClient {
  id: string;
  client_id: string;
  client_name: string;
  client_code: string;
  phone: string;
  amount: number;
  amount_paid?: number;
  currency: "KES" | "USD";
  balance: number;
  description: string;
  reference_number: string;
  debt_date: string;
  due_date: string;
  paid_date?: string | null;
  status: "pending" | "overdue" | "paid" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  notes: string;
  created_at: string;
}

interface Stats {
  overdue: number;
  pending: number;
  paid: number;
  totalBalance: number;
}

export default function Debts() {
  const [debts, setDebts] = useState<DebtWithClient[]>([]);
  const [filteredDebts, setFilteredDebts] = useState<DebtWithClient[]>([]);
  const [stats, setStats] = useState<Stats>({
    overdue: 0,
    pending: 0,
    paid: 0,
    totalBalance: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtWithClient | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showAddMoreDebt, setShowAddMoreDebt] = useState(false);
  const [addMoreAmount, setAddMoreAmount] = useState("");
  const [addMoreReason, setAddMoreReason] = useState("");
  const [loading, setLoading] = useState(true);

  const [newDebt, setNewDebt] = useState({
    amount: "",
    currency: "KES" as "KES" | "USD",
    description: "",
    due_date: "",
    clientName: "",
    clientPhone: "",
  });

  useEffect(() => {
    loadDebts();
  }, []);

  useEffect(() => {
    filterDebts();
  }, [debts, searchTerm, statusFilter, viewMode]);

  async function loadDebts() {
    try {
      const { data, error } = await supabase
        .from("client_debts")
        .select(
          "id, debtor_name, debtor_phone, amount, amount_paid, currency, balance, description, debt_date, due_date, paid_date, status, priority, created_at"
        )
        .order("due_date", { ascending: true });

      if (error) throw error;

      const debtsWithClients = (data || []).map((debt: any) => {
        const dueDate = new Date(debt.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const status =
          debt.status !== "paid" && dueDate < today ? "overdue" : debt.status;

        return {
          ...debt,
          status,
          client_name: debt.debtor_name || "Unknown",
          client_code: "",
          phone: debt.debtor_phone || "",
        };
      });

      setDebts(debtsWithClients);
      calculateStats(debtsWithClients);
    } catch (error: any) {
      console.error("Error loading debts:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function calculateStats(debtsData: DebtWithClient[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = debtsData.filter((d) => {
      if (d.status === "paid" || d.status === "cancelled") return false;
      const dueDate = new Date(d.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return d.status === "overdue" || dueDate < today;
    }).length;

    const pending = debtsData.filter((d) => {
      if (d.status === "paid" || d.status === "cancelled") return false;
      const dueDate = new Date(d.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return d.status === "pending" && dueDate >= today;
    }).length;

    const paid = debtsData.filter((d) => d.status === "paid").length;
    const totalBalance = debtsData
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((sum, d) => sum + d.balance, 0);

    setStats({ overdue, pending, paid, totalBalance });
  }

  const filterDebts = useCallback(() => {
    let filtered = debts;

    if (viewMode === "active") {
      filtered = filtered.filter(
        (d) => d.status !== "paid" && d.status !== "cancelled"
      );
    } else {
      filtered = filtered.filter((d) => d.status === "paid");
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.client_name || "").toLowerCase().includes(term) ||
          (d.client_code || "").toLowerCase().includes(term) ||
          (d.description || "").toLowerCase().includes(term)
      );
    }

    setFilteredDebts(filtered);
  }, [debts, searchTerm, statusFilter, viewMode]);

  function getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "overdue":
        return "text-red-700 bg-red-100 border-2 border-red-500";
      case "pending":
        return "text-amber-400 bg-amber-500/20";
      case "paid":
        return "text-emerald-600 bg-emerald-500/20";
      case "cancelled":
        return "text-gray-600 bg-gray-500/20";
      default:
        return "text-gray-600 bg-gray-500/20";
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-500/20";
      case "high":
        return "text-orange-400 bg-orange-500/20";
      case "normal":
        return "text-blue-600 bg-blue-500/20";
      case "low":
        return "text-gray-600 bg-gray-500/20";
      default:
        return "text-gray-600 bg-gray-500/20";
    }
  }

  // Parse description into structured history entries.
  function parseDebtHistory(description: string | null | undefined) {
    if (!description) return [];
    const lines = description
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const entries = lines
      .filter((l) => l.startsWith("["))
      .map((line) => {
        const m = line.match(/^\[([^\]]+)\]\s*Added\s+(.+?)(?:\s*:\s*(.*))?$/i);
        if (m) {
          return {
            date: m[1],
            amount: m[2],
            note: m[3] || "",
            raw: line,
          };
        } else {
          return {
            date: "",
            amount: "",
            note: line,
            raw: line,
          };
        }
      });

    return entries;
  }

  function getInitialDescription(description: string | null | undefined) {
    if (!description) return "";
    const lines = description
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const initialLines = lines.filter((l) => !l.startsWith("["));
    return initialLines.join("\n");
  }

  async function handleAddDebt(e: React.FormEvent) {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: debtError } = await supabase.from("client_debts").insert([
        {
          user_id: user.id,
          debtor_name: newDebt.clientName,
          debtor_phone: newDebt.clientPhone,
          amount: parseFloat(newDebt.amount),
          currency: newDebt.currency,
          description: newDebt.description,
          due_date: newDebt.due_date,
          priority: "normal",
          status: "pending",
        },
      ]);

      if (debtError) {
        toast.error("Failed to create debt: " + debtError.message);
        return;
      }

      setShowAddModal(false);
      setNewDebt({
        amount: "",
        currency: "KES",
        description: "",
        due_date: "",
        clientName: "",
        clientPhone: "",
      });
      await loadDebts();
      toast.success("Debt created successfully!");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred: " + error.message);
    }
  }

  function handleViewDebt(debt: DebtWithClient) {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setShowViewModal(true);
  }

  async function handleRecordPayment() {
    if (!selectedDebt || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedDebt.balance) {
      toast.error("Invalid payment amount");
      return;
    }

    try {
      const newBalance = selectedDebt.balance - amount;
      const newStatus = newBalance === 0 ? "paid" : selectedDebt.status;

      const { error } = await supabase
        .from("client_debts")
        .update({
          amount_paid: (selectedDebt.amount_paid || 0) + amount,
          status: newStatus,
          paid_date:
            newBalance === 0 ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", selectedDebt.id);

      if (error) throw error;

      toast.success("Payment recorded successfully!");
      setShowViewModal(false);
      setPaymentAmount("");
      await loadDebts();

      if (newStatus === "paid") {
        setViewMode("history");
      }
    } catch (error: any) {
      toast.error("Failed to record payment: " + error.message);
    }
  }

  async function handleDeleteDebt(id: string) {
    if (!confirm("Are you sure you want to delete this debt?")) return;

    try {
      const { error } = await supabase
        .from("client_debts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadDebts();
      toast.success("Debt deleted successfully!");
    } catch (error: any) {
      toast.error("Error deleting debt: " + error.message);
    }
  }

  async function handleAddMoreDebt() {
    if (!selectedDebt || !addMoreAmount) return;

    const additionalAmount = parseFloat(addMoreAmount);
    if (isNaN(additionalAmount) || additionalAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const newAmount = selectedDebt.amount + additionalAmount;
      const today = new Date().toLocaleDateString();
      const additionNote = `\n[${today}] Added ${formatCurrency(
        additionalAmount,
        selectedDebt.currency
      )}${addMoreReason ? `: ${addMoreReason}` : ""}`;
      const updatedDescription = selectedDebt.description
        ? selectedDebt.description + additionNote
        : additionNote;

      const { error } = await supabase
        .from("client_debts")
        .update({
          amount: newAmount,
          description: updatedDescription,
        })
        .eq("id", selectedDebt.id);

      if (error) throw error;

      toast.success(
        `Added ${formatCurrency(
          additionalAmount,
          selectedDebt.currency
        )} to debt!`
      );
      setShowAddMoreDebt(false);
      setAddMoreAmount("");
      setAddMoreReason("");
      setSelectedDebt(null);
      await loadDebts();
    } catch (error: any) {
      toast.error("Failed to add to debt: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-900">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-gray-200 hover:shadow-3xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Overdue</p>
              <p className="text-2xl font-black text-red-600">{stats.overdue}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-gray-200 hover:shadow-3xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Pending</p>
              <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
              <Calendar className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-gray-200 hover:shadow-3xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Paid</p>
              <p className="text-2xl font-black text-emerald-600">{stats.paid}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-gray-200 hover:shadow-3xl hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Total Balance</p>
              <p className="text-2xl font-black text-blue-600">
                {formatCurrency(stats.totalBalance, "KES")}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border-2 border-gray-200">
        {/*
          Responsive toolbar improvements:
           - search input takes full width
           - controls grouped to the right on larger screens
           - on mobile controls stack neatly with sensible widths:
             * toggle buttons appear side-by-side and stretch to fill available width
             * select and Add button become full width
        */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder={
                viewMode === "active"
                  ? "Search active debts by debtor name or description..."
                  : "Search paid debts (history)..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Controls group: toggles, status select, add button */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Active / History toggles */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setViewMode("active")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-semibold border-2 transition-all ${
                  viewMode === "active"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
                aria-pressed={viewMode === "active"}
              >
                Active
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-semibold border-2 transition-all ${
                  viewMode === "history"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
                aria-pressed={viewMode === "history"}
              >
                History
              </button>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-4 py-2 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-semibold shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>

            {/* Add Debt */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Add Debt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards List (active & history) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-gray-200 p-6">
        {filteredDebts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {viewMode === "active" ? "No active debts found" : "No history"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDebts.map((debt) => {
              const daysUntilDue = getDaysUntilDue(debt.due_date);
              return (
                <div
                  key={debt.id}
                  onClick={() => handleViewDebt(debt)}
                  className="group bg-gradient-to-br from-white to-gray-50 border-2 border-gray-100 rounded-2xl p-5 hover:shadow-2xl transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Client</p>
                      <p className="text-xl font-extrabold text-indigo-900">
                        {debt.client_name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {debt.client_code || "—"}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{debt.phone || "N/A"}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 text-xs rounded-full ${getStatusColor(
                          debt.status
                        )}`}
                      >
                        {debt.status.toUpperCase()}
                      </span>
                      <p className="text-sm text-gray-500 mt-2">
                        {viewMode === "history" && debt.paid_date
                          ? `Paid: ${new Date(debt.paid_date).toLocaleDateString()}`
                          : `Due: ${new Date(debt.due_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Only show balance owed (no total amount) */}
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Balance Owed</p>
                    <p className="text-2xl font-extrabold text-amber-600">
                      {formatCurrency(debt.balance, debt.currency)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p
                        className={`text-sm ${
                          daysUntilDue < 0
                            ? "text-red-600"
                            : daysUntilDue <= 7
                            ? "text-amber-600"
                            : "text-gray-600"
                        }`}
                      >
                        {viewMode === "history"
                          ? debt.paid_date
                            ? `Paid on ${new Date(debt.paid_date).toLocaleDateString()}`
                            : "—"
                          : daysUntilDue < 0
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                          ? "Due today"
                          : `${daysUntilDue} days left`}
                      </p>
                      <p className="text-sm mt-2 text-gray-500">
                        Priority{" "}
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full ${getPriorityColor(
                            debt.priority
                          )}`}
                        >
                          {debt.priority}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        {viewMode === "active" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDebt(debt);
                              setAddMoreAmount("");
                              setShowAddMoreDebt(true);
                            }}
                            title="Add more"
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDebt(debt.id);
                          }}
                          title="Delete"
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDebt(debt);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-gray-700 max-h-16 overflow-hidden">
                    {debt.description ? (
                      <p className="whitespace-pre-wrap line-clamp-3">{debt.description}</p>
                    ) : (
                      <p className="text-gray-400 italic">No description</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* The rest of the modals (Add, View, Add More) remain unchanged */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Debt"
        >
          <form onSubmit={handleAddDebt} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Debtor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newDebt.clientName}
                  onChange={(e) =>
                    setNewDebt({ ...newDebt, clientName: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Phone"
                  value={newDebt.clientPhone}
                  onChange={(e) =>
                    setNewDebt({ ...newDebt, clientPhone: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={newDebt.amount}
                  onChange={(e) =>
                    setNewDebt({ ...newDebt, amount: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={newDebt.currency}
                  onChange={(e) =>
                    setNewDebt({
                      ...newDebt,
                      currency: e.target.value as "KES" | "USD",
                    })
                  }
                  className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                required
                value={newDebt.description}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, description: e.target.value })
                }
                className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                required
                value={newDebt.due_date}
                onChange={(e) =>
                  setNewDebt({ ...newDebt, due_date: e.target.value })
                }
                className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 border-2 border-gray-200 font-bold transition-all duration-200 shadow-lg active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 font-bold"
              >
                Add Debt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showViewModal && selectedDebt && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Debt Details & Payment"
        >
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl p-6 space-y-4 border-2 border-gray-200 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedDebt.client_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedDebt.client_code}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Number: {selectedDebt.phone || "N/A"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    selectedDebt.status
                  )}`}
                >
                  {selectedDebt.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedDebt.amount, selectedDebt.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance Due</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(selectedDebt.balance, selectedDebt.currency)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="text-gray-900">
                    {new Date(selectedDebt.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days Until Due</p>
                  <p
                    className={`font-medium ${
                      getDaysUntilDue(selectedDebt.due_date) < 0
                        ? "text-red-600"
                        : getDaysUntilDue(selectedDebt.due_date) <= 7
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {getDaysUntilDue(selectedDebt.due_date) < 0
                      ? `${Math.abs(
                          getDaysUntilDue(selectedDebt.due_date)
                        )} days overdue`
                      : getDaysUntilDue(selectedDebt.due_date) === 0
                      ? "Due today"
                      : `${getDaysUntilDue(selectedDebt.due_date)} days left`}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {getInitialDescription(selectedDebt.description) ||
                    "— No initial description —"}
                </p>
              </div>

              {(() => {
                const history = parseDebtHistory(selectedDebt.description);
                if (!history || history.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Debt History</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              Date
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              Change
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              Note
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h, idx) => (
                            <tr key={idx} className="even:bg-white odd:bg-gray-50">
                              <td className="px-3 py-2 text-gray-800">{h.date || "—"}</td>
                              <td className="px-3 py-2 text-gray-800">{h.amount || "—"}</td>
                              <td className="px-3 py-2 text-gray-700">{h.note || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {selectedDebt.status !== "paid" && selectedDebt.balance > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Record Payment
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Payment Amount ({selectedDebt.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      max={selectedDebt.balance}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`Max: ${selectedDebt.balance}`}
                      className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleRecordPayment}
                    disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-200"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            )}

            {selectedDebt.status === "paid" && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-lg">
                <p className="text-emerald-600 font-black text-center text-lg">
                  ✓ This debt has been fully paid
                </p>
                {selectedDebt.paid_date && (
                  <p className="text-center text-sm text-gray-600 mt-2">
                    Paid on: {new Date(selectedDebt.paid_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setShowViewModal(false)}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 border-2 border-gray-200 font-bold transition-all duration-200 shadow-lg active:scale-95"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {showAddMoreDebt && selectedDebt && (
        <Modal
          isOpen={showAddMoreDebt}
          onClose={() => {
            setShowAddMoreDebt(false);
            setAddMoreAmount("");
            setSelectedDebt(null);
          }}
          title="Add More to Debt"
        >
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Debtor</p>
                  <p className="text-lg font-black text-gray-900">
                    {selectedDebt.client_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Current Debt</p>
                    <p className="text-xl font-black text-red-600">
                      {formatCurrency(selectedDebt.amount, selectedDebt.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Balance</p>
                    <p className="text-xl font-black text-amber-600">
                      {formatCurrency(selectedDebt.balance, selectedDebt.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Increase Debt Amount
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Additional Amount ({selectedDebt.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addMoreAmount}
                    onChange={(e) => setAddMoreAmount(e.target.value)}
                    placeholder="Enter amount to add"
                    className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={addMoreReason}
                    onChange={(e) => setAddMoreReason(e.target.value)}
                    placeholder="Why is this debt increasing?"
                    rows={3}
                    className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>

                {addMoreAmount && parseFloat(addMoreAmount) > 0 && (
                  <div className="bg-white rounded-xl p-4 border-2 border-orange-200">
                    <p className="text-sm text-gray-600 font-semibold mb-1">New Total Debt:</p>
                    <p className="text-2xl font-black text-red-600">
                      {formatCurrency(selectedDebt.amount + parseFloat(addMoreAmount), selectedDebt.currency)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddMoreDebt(false);
                  setAddMoreAmount("");
                  setSelectedDebt(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 border-2 border-gray-200 font-bold transition-all duration-200 shadow-lg active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoreDebt}
                disabled={!addMoreAmount || parseFloat(addMoreAmount) <= 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white rounded-xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 font-bold"
              >
                Add to Debt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}