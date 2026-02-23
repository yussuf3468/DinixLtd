import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Phone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Plus,
  Trash2,
  FileText,
  X,
  Edit2,
  Lock,
} from "lucide-react";
import { formatCurrency } from "../lib/currency";
import { generateClientPDFReport } from "../lib/pdfGenerator";

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  last_transaction_date: string | null;
}

interface Transaction {
  id: string;
  debit: number;
  credit: number;
  description: string;
  transaction_date: string;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
}

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [transactionsKES, setTransactionsKES] = useState<Transaction[]>([]);
  const [transactionsUSD, setTransactionsUSD] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"kes" | "usd">("kes");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editClientData, setEditClientData] = useState({
    client_name: "",
    phone: "",
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<{
    type: "edit" | "delete";
    data: any;
  } | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [summaryKES, setSummaryKES] = useState({
    receivable: 0,
    paid: 0,
    balance: 0,
  });
  const [summaryUSD, setSummaryUSD] = useState({
    receivable: 0,
    paid: 0,
    balance: 0,
  });

  // Inline editing state
  const [newRow, setNewRow] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    credit: "",
    debit: "",
  });
  const [isSavingInline, setIsSavingInline] = useState(false);

  useEffect(() => {
    if (user && clientId) {
      loadClientData();
    }
  }, [user, clientId]);

  const calculateSummary = useCallback(
    (transactions: Transaction[], setSummary: Function) => {
      const receivable = transactions.reduce(
        (sum, t) => sum + (t.debit || 0),
        0,
      );
      const paid = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
      const balance = paid - receivable;

      setSummary({ receivable, paid, balance });
    },
    [],
  );

  const currentTransactions = useMemo(
    () => (activeTab === "kes" ? transactionsKES : transactionsUSD),
    [activeTab, transactionsKES, transactionsUSD],
  );

  const currentSummary = useMemo(
    () => (activeTab === "kes" ? summaryKES : summaryUSD),
    [activeTab, summaryKES, summaryUSD],
  );

  const currencySymbol = useMemo(
    () => (activeTab === "kes" ? "KES" : "USD"),
    [activeTab],
  );

  // Count how many transactions have "mg" in their description (mileage entries)
  const mgCount = useMemo(
    () =>
      currentTransactions.filter((t) => /\bmg\b/i.test(t.description)).length,
    [currentTransactions],
  );

  const loadClientData = async () => {
    if (!user || !clientId) return;

    try {
      setLoading(true);

      // Load all data in parallel
      const [clientResult, kesResult, usdResult] = await Promise.all([
        supabase
          .from("clients")
          .select(
            "id, client_name, client_code, email, phone, business_name, address, status, notes, created_at, last_transaction_date",
          )
          .eq("id", clientId)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("client_transactions_kes")
          .select(
            "id, transaction_date, description, credit, debit, reference_number, payment_method, notes, created_at",
          )
          .eq("client_id", clientId)
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("client_transactions_usd")
          .select(
            "id, transaction_date, description, credit, debit, reference_number, payment_method, notes, created_at",
          )
          .eq("client_id", clientId)
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (clientResult.error) throw clientResult.error;
      if (kesResult.error) throw kesResult.error;
      if (usdResult.error) throw usdResult.error;

      if (!clientResult.data) {
        toast.error("Client not found");
        onBack();
        return;
      }

      setClient(clientResult.data);
      setTransactionsKES(kesResult.data || []);
      setTransactionsUSD(usdResult.data || []);

      // Calculate summaries
      calculateSummary(kesResult.data || [], setSummaryKES);
      calculateSummary(usdResult.data || [], setSummaryUSD);
    } catch (error: any) {
      console.error("Error loading client data:", error);
      toast.error(`Failed to load client: ${error.message}`);
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePinProtectedAction = (action: "edit" | "delete", data: any) => {
    setPinAction({ type: action, data });
    setShowPinModal(true);
    setPinInput("");
  };

  const verifyPinAndExecute = async () => {
    const correctPin = "2580"; // You can change this or store in environment variable

    if (pinInput !== correctPin) {
      toast.error("Incorrect PIN!");
      setPinInput("");
      return;
    }

    setShowPinModal(false);
    setPinInput("");

    if (!pinAction) return;

    if (pinAction.type === "delete") {
      await executeDelete(
        pinAction.data.transactionId,
        pinAction.data.currency,
      );
    } else if (pinAction.type === "edit") {
      setEditingTransaction(pinAction.data.transaction);
      setShowEditTransaction(true);
    }

    setPinAction(null);
  };

  const handleUpdateClientInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          client_name: editClientData.client_name,
          phone: editClientData.phone,
        })
        .eq("id", clientId);

      if (error) throw error;

      setClient({
        ...client,
        client_name: editClientData.client_name,
        phone: editClientData.phone,
      });
      setShowEditClient(false);
      toast.success("Client information updated successfully!");
    } catch (error: any) {
      toast.error("Error updating client: " + error.message);
    }
  };

  const executeDelete = async (
    transactionId: string,
    currency: "kes" | "usd",
  ) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const table =
        currency === "kes"
          ? "client_transactions_kes"
          : "client_transactions_usd";
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("id", transactionId);

      if (deleteError) {
        console.error("Error deleting transaction:", deleteError);
        toast.error("Failed to delete transaction.");
        return;
      }

      // Remove transaction from state without full reload
      if (currency === "kes") {
        const updatedTransactions = transactionsKES.filter(
          (t) => t.id !== transactionId,
        );
        setTransactionsKES(updatedTransactions);
        calculateSummary(updatedTransactions, setSummaryKES);
      } else {
        const updatedTransactions = transactionsUSD.filter(
          (t) => t.id !== transactionId,
        );
        setTransactionsUSD(updatedTransactions);
        calculateSummary(updatedTransactions, setSummaryUSD);
      }
      toast.success("Transaction deleted successfully!");
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction || submitting) return;

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const transactionType = formData.get("transaction_type") as string;
    const amount = Number(formData.get("amount"));

    try {
      const transactionData = {
        debit: ["invoice", "charge", "expense"].includes(transactionType)
          ? amount
          : 0,
        credit: ["payment", "refund", "credit"].includes(transactionType)
          ? amount
          : 0,
        description: formData.get("description"),
        transaction_date: formData.get("transaction_date"),
      };

      const table =
        activeTab === "kes"
          ? "client_transactions_kes"
          : "client_transactions_usd";

      const { data: updatedRows, error: updateError } = await supabase
        .from(table)
        .update(transactionData)
        .eq("id", editingTransaction.id)
        .eq("user_id", user!.id)
        .select();

      if (updateError) {
        console.error("Error updating transaction:", updateError);
        toast.error("Failed to update transaction. Please try again.");
        return;
      }

      // Supabase returns an empty array (no error) when RLS silently blocks
      if (!updatedRows || updatedRows.length === 0) {
        console.error(
          "Update returned 0 rows — likely no UPDATE policy on Supabase. Run migration 007 in Supabase SQL Editor.",
        );
        toast.error(
          "Update blocked by database policy. Please contact support or check Supabase RLS settings.",
        );
        return;
      }

      setShowEditTransaction(false);
      setEditingTransaction(null);

      // Reload from DB so UI always reflects the true persisted state
      await loadClientData();

      toast.success("Transaction updated successfully!");
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const currency = formData.get("currency") as string;
    const transactionType = formData.get("transaction_type") as string;
    const amount = Number(formData.get("amount"));

    try {
      // Determine debit or credit based on transaction type
      const transactionData = {
        client_id: clientId,
        user_id: user?.id,
        debit: ["invoice", "charge", "expense"].includes(transactionType)
          ? amount
          : 0,
        credit: ["payment", "refund", "credit"].includes(transactionType)
          ? amount
          : 0,
        description: formData.get("description"),
        transaction_date: formData.get("transaction_date"),
        payment_method: null,
        reference_number: null,
        notes: null,
      };

      const table =
        currency === "kes"
          ? "client_transactions_kes"
          : "client_transactions_usd";
      const { data, error: insertError } = await supabase
        .from(table)
        .insert(transactionData)
        .select()
        .single();

      if (insertError) {
        console.error("Error adding transaction:", insertError);
        toast.error("Failed to add transaction. Please try again.");
        return;
      }

      // Add new transaction to state without full reload
      if (data) {
        if (currency === "kes") {
          const updatedTransactions = [data, ...transactionsKES];
          setTransactionsKES(updatedTransactions);
          calculateSummary(updatedTransactions, setSummaryKES);
        } else {
          const updatedTransactions = [data, ...transactionsUSD];
          setTransactionsUSD(updatedTransactions);
          calculateSummary(updatedTransactions, setSummaryUSD);
        }
      }

      setShowAddTransaction(false);
      toast.success("Transaction added successfully!");
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle inline row addition
  const handleInlineAdd = async () => {
    if (!newRow.description.trim()) {
      return; // Don't save if no description
    }

    const creditAmount = parseFloat(newRow.credit) || 0;
    const debitAmount = parseFloat(newRow.debit) || 0;

    if (creditAmount === 0 && debitAmount === 0) {
      return; // Don't save if both amounts are zero
    }

    setIsSavingInline(true);
    try {
      const transactionData = {
        client_id: clientId,
        user_id: user?.id,
        debit: debitAmount,
        credit: creditAmount,
        description: newRow.description.trim(),
        transaction_date: newRow.date,
        payment_method: null,
        reference_number: null,
        notes: null,
      };

      const table =
        activeTab === "kes"
          ? "client_transactions_kes"
          : "client_transactions_usd";
      const { data, error: insertError } = await supabase
        .from(table)
        .insert(transactionData)
        .select()
        .single();

      if (insertError) {
        console.error("Error adding transaction:", insertError);
        toast.error("Failed to add transaction. Please try again.");
        setIsSavingInline(false);
        return;
      }

      // Add new transaction to state
      if (data) {
        if (activeTab === "kes") {
          const updatedTransactions = [data, ...transactionsKES];
          setTransactionsKES(updatedTransactions);
          calculateSummary(updatedTransactions, setSummaryKES);
        } else {
          const updatedTransactions = [data, ...transactionsUSD];
          setTransactionsUSD(updatedTransactions);
          calculateSummary(updatedTransactions, setSummaryUSD);
        }
      }

      // Reset the form
      setNewRow({
        date: new Date().toISOString().split("T")[0],
        description: "",
        credit: "",
        debit: "",
      });
      setIsSavingInline(false);
      toast.success("Transaction added successfully!");
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsSavingInline(false);
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineAdd();
    } else if (e.key === "Tab" && field === "debit") {
      // When tabbing from last field, save the transaction
      if (!e.shiftKey) {
        e.preventDefault();
        handleInlineAdd();
      }
    }
  };

  const generatePDFReport = async (
    reportType: "full" | "kes-only" | "usd-only" = "full",
  ) => {
    if (!client) return;
    setShowCurrencyPicker(false);

    try {
      const isMobileBrowser =
        typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

      const shareSupported =
        isMobileBrowser &&
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        typeof (navigator as any).share === "function" &&
        "canShare" in navigator;

      if (shareSupported) {
        // Use Web Share API with a real PDF file when available
        generateClientPDFReport(
          {
            client: {
              client_name: client.client_name,
              client_code: client.client_code,
              email: client.email,
              phone: client.phone,
              business_name: client.business_name,
              address: client.address,
            },
            transactionsKES,
            transactionsUSD,
            summaryKES,
            summaryUSD,
            reportType,
          },
          async (doc, fileName) => {
            try {
              const blob = doc.output("blob");
              const file = new File([blob], fileName, {
                type: "application/pdf",
              });

              const nav = navigator as any;
              if (nav.canShare && nav.canShare({ files: [file] })) {
                await nav.share({
                  files: [file],
                  title: "Account Statement",
                  text: `${client.client_name} • ${client.client_code}`,
                });
              } else {
                // Fallback to normal download if file sharing isn't allowed
                doc.save(fileName);
              }
            } catch (shareError) {
              console.error("Error sharing PDF:", shareError);
              toast.error("Failed to share statement. Downloading instead.");
              doc.save(fileName);
            }
          },
        );
      } else {
        // Desktop or unsupported browsers: standard browser download behaviour
        generateClientPDFReport({
          client: {
            client_name: client.client_name,
            client_code: client.client_code,
            email: client.email,
            phone: client.phone,
            business_name: client.business_name,
            address: client.address,
          },
          transactionsKES,
          transactionsUSD,
          summaryKES,
          summaryUSD,
          reportType,
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(
        `Failed to generate PDF report: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading client details...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Client not found</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back Button - Mobile Optimized */}
        <button
          onClick={onBack}
          className="group flex items-center gap-3 text-gray-700 hover:text-emerald-600 mb-6 sm:mb-8 transition-all duration-500 active:scale-95 hover:-translate-x-1"
        >
          <div className="p-2.5 rounded-xl bg-white border-2 border-gray-200 shadow-lg group-hover:shadow-xl group-hover:shadow-emerald-500/20 group-hover:border-emerald-400 group-hover:bg-gradient-to-br group-hover:from-emerald-50 group-hover:to-teal-50 transition-all duration-500">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="font-bold text-sm sm:text-base tracking-tight">
            Back to Clients
          </span>
        </button>

        {/* Client Header - Compact */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg p-4 sm:p-5 mb-5 transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {client.client_name}
                </h1>
                <button
                  onClick={() => {
                    setEditClientData({
                      client_name: client.client_name,
                      phone: client.phone || "",
                    });
                    setShowEditClient(true);
                  }}
                  className="p-2 hover:bg-emerald-50 rounded-lg transition-all duration-200 active:scale-90 group"
                  title="Edit client info"
                >
                  <Edit2 className="w-5 h-5 text-gray-500 group-hover:text-emerald-600" />
                </button>
                <span className="px-3 py-1 bg-emerald-500 text-white text-[0.7rem] font-bold rounded-full shadow-sm border border-emerald-500">
                  {client.status.toUpperCase()}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 mt-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                <p className="text-gray-700 font-mono text-xs font-semibold tracking-wide">
                  {client.client_code}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCurrencyPicker(true)}
              className="group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-md hover:shadow-blue-500/40 transition-all duration-300 font-semibold text-xs sm:text-sm active:scale-95 border border-blue-500 mt-3 sm:mt-0"
            >
              <Download className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
              <span className="tracking-wide">Download Statement</span>
            </button>

            {/* ── Currency picker modal ── */}
            {showCurrencyPicker && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => setShowCurrencyPicker(false)}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Download Statement
                  </h3>
                  <p className="text-xs text-gray-500 mb-5">
                    Choose which currency to include:
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => generatePDFReport("full")}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors text-left"
                    >
                      {/* <span className="text-lg">🌍</span> */}
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Both (KSH + USD)
                        </p>
                        <p className="text-xs text-gray-500">
                          Full statement all currencies
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => generatePDFReport("kes-only")}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-colors text-left"
                    >
                      <span className="text-lg">🇰🇪</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          KSH Only
                        </p>
                        <p className="text-xs text-gray-500">
                          Kenyan Shillings transactions
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => generatePDFReport("usd-only")}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors text-left"
                    >
                      <span className="text-lg">🇺🇸</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          USD Only
                        </p>
                        <p className="text-xs text-gray-500">
                          US Dollar transactions
                        </p>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCurrencyPicker(false)}
                    className="mt-4 w-full py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Info Grid - Compact */}
        <div className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {client.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-purple-500/30">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">
                    Phone
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {client.phone}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Currency Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("kes")}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all duration-300 text-sm sm:text-base shadow-sm border ${
              activeTab === "kes"
                ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-400 shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-emerald-300 hover:shadow-sm"
            }`}
          >
            <span className="hidden sm:inline">🇰🇪 Kenyan Shillings</span>
            <span className="sm:hidden">KES</span>
          </button>
          <button
            onClick={() => setActiveTab("usd")}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all duration-300 text-sm sm:text-base shadow-sm border ${
              activeTab === "usd"
                ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 text-white border-blue-400 shadow-md"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-blue-300 hover:shadow-sm"
            }`}
          >
            <span className="hidden sm:inline">🇺🇸 US Dollars</span>
            <span className="sm:hidden">USD</span>
          </button>
        </div>

        {/* Financial Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Balance Card (Outstanding/Credit) FIRST */}
            <div
              className={`rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 border ${
                currentSummary.balance >= 0
                  ? "bg-blue-50 border-blue-100 text-blue-800"
                  : "bg-orange-50 border-orange-100 text-orange-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[0.68rem] sm:text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wide border ${
                    currentSummary.balance >= 0
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-orange-100 text-orange-700 border-orange-200"
                  }`}
                >
                  {currentSummary.balance >= 0 ? "CREDIT" : "OUTSTANDING"}
                </span>
                <DollarSign
                  className={`w-5 h-5 ${
                    currentSummary.balance >= 0
                      ? "text-blue-500"
                      : "text-orange-500"
                  }`}
                />
              </div>
              <p className="text-xs sm:text-sm mb-1 font-semibold">
                {currentSummary.balance >= 0
                  ? "Credit Balance"
                  : "Outstanding Balance"}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(
                  Math.abs(currentSummary.balance),
                  currencySymbol,
                )}
              </p>
            </div>

            {/* Total IN Card (middle) */}
            <div className="bg-emerald-50 rounded-2xl p-4 sm:p-5 text-emerald-800 shadow-sm hover:shadow-md transition-all duration-300 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.68rem] sm:text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold uppercase tracking-wide border border-emerald-200">
                  RECEIVED
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 mb-1 font-semibold">
                Payments Received
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(currentSummary.paid, currencySymbol)}
              </p>
            </div>

            {/* Total OUT Card (Receivables) LAST */}
            <div className="bg-red-50 rounded-2xl p-4 sm:p-5 text-red-800 shadow-sm hover:shadow-md transition-all duration-300 border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.68rem] sm:text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold uppercase tracking-wide border border-red-200">
                  RECEIVABLES
                </span>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs sm:text-sm text-red-700 mb-1 font-semibold">
                Total Receivables
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(currentSummary.receivable, currencySymbol)}
              </p>
            </div>

            {/* MG / Mileage Count Card */}
            <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 text-amber-800 shadow-sm hover:shadow-md transition-all duration-300 border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.68rem] sm:text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold uppercase tracking-wide border border-amber-200">
                  MILEAGE
                </span>
                <span className="text-lg">🚛</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-700 mb-1 font-semibold">
                MG Count
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {mgCount}
                <span className="text-sm font-semibold ml-1 opacity-70">
                  trips
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div className="bg-white backdrop-blur-xl rounded-3xl border border-gray-200 shadow-md shadow-gray-200/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-gray-300/70">
          <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-200 relative">
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-emerald-600 text-white rounded-full active:opacity-80 absolute right-4 top-4"
              aria-label="Add transaction"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pr-12 sm:pr-16">
              <div>
                <h2 className="text-xl sm:text-3xl font-black text-gray-900 mb-2 tracking-tight">
                  Transaction History
                </h2>
                <p className="text-sm sm:text-base text-gray-600 font-semibold">
                  {currentTransactions.length} transaction
                  {currentTransactions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {currentTransactions.length === 0 ? (
            <div className="text-center py-16 sm:py-20 px-4">
              <div className="inline-flex p-4 sm:p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full mb-4 sm:mb-6">
                <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-600" />
              </div>
              <p className="text-gray-600 text-base sm:text-lg mb-6 font-medium">
                No transactions yet
              </p>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 font-bold text-sm sm:text-base active:scale-95"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                Add First Transaction
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {/* Mobile Inline Add Card - AT TOP */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-b-4 border-emerald-500 space-y-4 sticky top-0 z-20 shadow-lg">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-base font-black text-gray-900 tracking-tight">
                      Quick Add Transaction
                    </p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="date"
                      value={newRow.date}
                      onChange={(e) =>
                        setNewRow({ ...newRow, date: e.target.value })
                      }
                      className="w-full px-4 py-3 text-sm bg-white text-gray-900 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-lg transition-all font-semibold [color-scheme:light]"
                      disabled={isSavingInline}
                    />

                    <input
                      type="text"
                      placeholder="Description..."
                      value={newRow.description}
                      onChange={(e) =>
                        setNewRow({ ...newRow, description: e.target.value })
                      }
                      className="w-full px-4 py-3 text-sm bg-white text-gray-900 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-500 shadow-lg transition-all font-semibold"
                      disabled={isSavingInline}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black text-emerald-700 mb-2 block uppercase tracking-wider">
                          Money IN
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={newRow.credit}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              credit: e.target.value,
                              debit: "",
                            })
                          }
                          className="w-full px-4 py-3 text-sm bg-emerald-50 text-gray-900 border-2 border-emerald-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 placeholder:text-gray-500 shadow-lg transition-all font-bold"
                          disabled={isSavingInline}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-red-700 mb-2 block uppercase tracking-wider">
                          Money OUT
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={newRow.debit}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              debit: e.target.value,
                              credit: "",
                            })
                          }
                          className="w-full px-4 py-3 text-sm bg-red-50 text-gray-900 border-2 border-red-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 placeholder:text-gray-500 shadow-lg transition-all font-bold"
                          disabled={isSavingInline}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleInlineAdd}
                      disabled={isSavingInline || !newRow.description.trim()}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-base border-2 border-emerald-500"
                    >
                      {isSavingInline ? "Saving..." : "✓ Add Transaction"}
                    </button>
                  </div>
                </div>

                {currentTransactions.map((transaction, index) => {
                  // Calculate balance from the end (current balance at top)
                  const remainingTransactions =
                    currentTransactions.slice(index);
                  const runningBalance = remainingTransactions.reduce(
                    (sum, t) =>
                      sum + Number(t.credit || 0) - Number(t.debit || 0),
                    0,
                  );

                  return (
                    <div
                      key={transaction.id}
                      className="p-4 hover:bg-white/80 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            {new Date(
                              transaction.transaction_date,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handlePinProtectedAction("edit", {
                                transaction,
                                currency: activeTab,
                              })
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-90"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handlePinProtectedAction("delete", {
                                transactionId: transaction.id,
                                currency: activeTab,
                              })
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-90"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                          <p className="text-xs text-emerald-600 font-semibold mb-1">
                            IN
                          </p>
                          {transaction.credit > 0 ? (
                            <p className="text-sm font-bold text-emerald-700">
                              +
                              {formatCurrency(
                                transaction.credit,
                                currencySymbol,
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">—</p>
                          )}
                        </div>

                        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                          <p className="text-xs text-red-600 font-semibold mb-1">
                            OUT
                          </p>
                          {transaction.debit > 0 ? (
                            <p className="text-sm font-bold text-red-700">
                              -
                              {formatCurrency(
                                transaction.debit,
                                currencySymbol,
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600">—</p>
                          )}
                        </div>

                        <div
                          className={`rounded-lg p-2 border ${
                            runningBalance >= 0
                              ? "bg-blue-50 border-blue-200"
                              : "bg-orange-50 border-orange-200"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold mb-1 ${
                              runningBalance >= 0
                                ? "text-blue-600"
                                : "text-orange-600"
                            }`}
                          >
                            Balance
                          </p>
                          <p
                            className={`text-sm font-bold ${
                              runningBalance >= 0
                                ? "text-blue-700"
                                : "text-orange-700"
                            }`}
                          >
                            {runningBalance >= 0 ? "+" : ""}
                            {formatCurrency(runningBalance, currencySymbol)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-white/80 border-b-2 border-gray-200">
                      <th className="w-32 px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="w-40 px-4 py-4 text-right text-xs font-bold text-emerald-600 uppercase tracking-wider">
                        IN
                      </th>
                      <th className="w-40 px-4 py-4 text-right text-xs font-bold text-red-600 uppercase tracking-wider">
                        OUT
                      </th>
                      <th className="w-40 px-4 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="w-20 px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* Inline Add Row - Excel Style - AT TOP */}
                    <tr className="bg-white/80 border-b-2 border-emerald-500/50 sticky top-[57px] z-10">
                      <td className="px-4 py-3">
                        <input
                          type="date"
                          value={newRow.date}
                          onChange={(e) =>
                            setNewRow({ ...newRow, date: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all [color-scheme:light]"
                          disabled={isSavingInline}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Enter description..."
                          value={newRow.description}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              description: e.target.value,
                            })
                          }
                          onKeyDown={(e) =>
                            handleInlineKeyDown(e, "description")
                          }
                          className="w-full px-3 py-2 text-sm bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-gray-600"
                          disabled={isSavingInline}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={newRow.credit}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              credit: e.target.value,
                              debit: "",
                            })
                          }
                          onKeyDown={(e) => handleInlineKeyDown(e, "credit")}
                          className="w-full px-3 py-2 text-sm text-right bg-emerald-50 text-gray-900 border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-gray-500"
                          disabled={isSavingInline}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={newRow.debit}
                          onChange={(e) =>
                            setNewRow({
                              ...newRow,
                              debit: e.target.value,
                              credit: "",
                            })
                          }
                          onKeyDown={(e) => handleInlineKeyDown(e, "debit")}
                          className="w-full px-3 py-2 text-sm text-right border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-gray-500 bg-red-50 text-gray-900"
                          disabled={isSavingInline}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-gray-500 italic">
                          {isSavingInline ? "Saving..." : "Auto-save"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={handleInlineAdd}
                          disabled={
                            isSavingInline || !newRow.description.trim()
                          }
                          className="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save transaction"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {currentTransactions.map((transaction, index) => {
                      // Calculate balance from the end (current balance at top)
                      const remainingTransactions =
                        currentTransactions.slice(index);
                      const runningBalance = remainingTransactions.reduce(
                        (sum, t) =>
                          sum + Number(t.credit || 0) - Number(t.debit || 0),
                        0,
                      );

                      return (
                        <tr
                          key={transaction.id}
                          className="hover:bg-white/80 transition-all duration-200"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {new Date(
                                transaction.transaction_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {transaction.credit > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 text-xs font-bold border border-emerald-500/30 whitespace-nowrap">
                                +
                                {formatCurrency(
                                  transaction.credit,
                                  currencySymbol,
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-700 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {transaction.debit > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200 whitespace-nowrap">
                                -
                                {formatCurrency(
                                  transaction.debit,
                                  currencySymbol,
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-700 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                                runningBalance >= 0
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                  : "bg-red-100 text-red-700 border border-red-300"
                              }`}
                            >
                              {runningBalance >= 0 ? "+" : ""}
                              {formatCurrency(runningBalance, currencySymbol)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() =>
                                  handlePinProtectedAction("edit", {
                                    transaction,
                                    currency: activeTab,
                                  })
                                }
                                className="p-2.5 text-blue-600 hover:bg-blue-500/10 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Edit transaction"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handlePinProtectedAction("delete", {
                                    transactionId: transaction.id,
                                    currency: activeTab,
                                  })
                                }
                                className="p-2.5 text-red-600 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Delete transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Add Transaction Modal - Ultra Modern */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden transform animate-scaleIn">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shadow-lg z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-lg">
                    Add Transaction
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-all duration-200 active:scale-90"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </button>
              </div>

              {/* Modal Body */}
              <form
                onSubmit={handleAddTransaction}
                className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(95vh-80px)]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-emerald-600">💱</span>
                      Transaction Type *
                    </label>
                    <select
                      name="transaction_type"
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-emerald-400"
                      required
                    >
                      <option
                        value="payment"
                        className="bg-white text-gray-900"
                      >
                        💰 Money IN (Payment)
                      </option>
                      <option
                        value="invoice"
                        className="bg-white text-gray-900"
                      >
                        📄 Money OUT (Invoice)
                      </option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-emerald-600">💵</span>
                      Amount *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-emerald-400 placeholder-gray-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                    <span className="text-emerald-600">🌍</span>
                    Currency *
                  </label>
                  <select
                    name="currency"
                    defaultValue={activeTab}
                    className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-emerald-400"
                    required
                  >
                    <option value="kes" className="bg-white text-gray-900">
                      🇰🇪 Kenyan Shillings (KES)
                    </option>
                    <option value="usd" className="bg-white text-gray-900">
                      🇺🇸 US Dollars (USD)
                    </option>
                  </select>
                </div>

                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                    <span className="text-emerald-600">📝</span>
                    Reason *
                  </label>
                  <input
                    type="text"
                    name="description"
                    required
                    className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-emerald-400 placeholder-gray-500"
                    placeholder="e.g., Payment for web development services"
                  />
                </div>

                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                    <span className="text-emerald-600">📅</span>
                    Date *
                  </label>
                  <input
                    type="date"
                    name="transaction_date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-emerald-400 [color-scheme:light]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddTransaction(false)}
                    className="flex-1 px-6 py-3 sm:py-3.5 bg-gray-100 border-2 border-gray-200 rounded-xl sm:rounded-2xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm sm:text-base active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-xl sm:rounded-2xl font-black hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 text-sm sm:text-base active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Adding..." : "✓ Add Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {showEditTransaction && editingTransaction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden transform animate-scaleIn">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shadow-lg z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Edit2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-lg">
                    Edit Transaction
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowEditTransaction(false);
                    setEditingTransaction(null);
                  }}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-all duration-200 active:scale-90"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </button>
              </div>

              <form
                onSubmit={handleEditTransaction}
                autoComplete="off"
                className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(95vh-80px)]"
              >
                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-blue-600">💱</span>
                      Transaction Type *
                    </label>
                    <select
                      name="transaction_type"
                      defaultValue={
                        editingTransaction.credit > 0 ? "payment" : "invoice"
                      }
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-blue-400 [&>option]:text-gray-900 [&>option]:bg-white"
                      required
                    >
                      <option value="payment">💰 Money IN (Payment)</option>
                      <option value="invoice">
                        📤 Money OUT (Invoice/Charge)
                      </option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-blue-600">💵</span>
                      Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0"
                      defaultValue={
                        editingTransaction.credit > 0
                          ? editingTransaction.credit
                          : editingTransaction.debit
                      }
                      required
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base font-bold hover:border-blue-400"
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-blue-600">📝</span>
                      Description *
                    </label>
                    <input
                      type="text"
                      name="description"
                      defaultValue={editingTransaction.description}
                      required
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-blue-400"
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <span className="text-blue-600">📅</span>
                      Date *
                    </label>
                    <input
                      type="date"
                      name="transaction_date"
                      defaultValue={editingTransaction.transaction_date}
                      required
                      className="w-full px-4 py-3 sm:py-3.5 bg-white text-gray-900 border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base font-semibold hover:border-blue-400 [color-scheme:light]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTransaction(false);
                      setEditingTransaction(null);
                    }}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 sm:py-3.5 bg-gray-100 border-2 border-gray-200 rounded-xl sm:rounded-2xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm sm:text-base active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 text-white rounded-xl sm:rounded-2xl font-black hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 text-sm sm:text-base active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Updating..." : "✓ Update Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full transform animate-scaleIn">
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 px-6 py-5 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white drop-shadow-lg">
                    Enter PIN
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setPinAction(null);
                    setPinInput("");
                  }}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-all duration-200 active:scale-90"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-700 text-center">
                  Enter your PIN to{" "}
                  {pinAction?.type === "edit" ? "edit" : "delete"} this
                  transaction
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(e.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      verifyPinAndExecute();
                    }
                  }}
                  placeholder="Enter PIN"
                  maxLength={4}
                  autoFocus
                  autoComplete="one-time-code"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-3.5 bg-white text-gray-900 text-center text-2xl tracking-widest border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 font-bold [text-security:disc]"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinAction(null);
                      setPinInput("");
                    }}
                    className="flex-1 px-6 py-3.5 bg-gray-100 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={verifyPinAndExecute}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white rounded-xl font-black hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 active:scale-95"
                  >
                    🔓 Verify
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Client Info Modal */}
        {showEditClient && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white/95 backdrop-blur-xl border-2 border-gray-200 rounded-3xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-hidden transform animate-scaleIn">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 px-6 py-5 shadow-lg z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Edit2 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white drop-shadow-lg">
                      Edit Client Info
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowEditClient(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 active:scale-90"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form
                onSubmit={handleUpdateClientInfo}
                className="p-6 space-y-5 overflow-y-auto max-h-[calc(95vh-80px)]"
              >
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <span className="text-emerald-600">👤</span>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={editClientData.client_name}
                    onChange={(e) =>
                      setEditClientData({
                        ...editClientData,
                        client_name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-semibold shadow-lg hover:border-emerald-400"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                    <span className="text-emerald-600">📱</span>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={editClientData.phone}
                    onChange={(e) =>
                      setEditClientData({
                        ...editClientData,
                        phone: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-semibold shadow-lg hover:border-emerald-400"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditClient(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 border-2 border-gray-200 font-bold transition-all duration-200 shadow-lg active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 font-black shadow-xl active:scale-95 border-2 border-emerald-500"
                  >
                    Update Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
