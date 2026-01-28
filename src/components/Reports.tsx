import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  FileText,
  TrendingUp,
  Filter,
  BarChart3,
  DollarSign,
  Users,
  Activity,
  CreditCard,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
} from "lucide-react";

interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalBalanceKES: number;
  totalBalanceUSD: number;
  totalTransactions: number;
}

interface TopClient {
  client_id: string;
  client_name: string;
  client_code: string;
  total_balance_kes: number;
  total_balance_usd: number;
  transaction_count: number;
}

interface MonthlyTrend {
  month: string;
  transactions_kes: number;
  transactions_usd: number;
  balance_kes: number;
  balance_usd: number;
}

type ReportPeriod = "current" | "last3" | "last6" | "year" | "custom";
type Currency = "KES" | "USD" | "BOTH";

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientStats>({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    totalBalanceKES: 0,
    totalBalanceUSD: 0,
    totalTransactions: 0,
  });
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("last6");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("BOTH");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, selectedPeriod, selectedCurrency, customStartDate, customEndDate]);

  const getDateRange = useMemo(() => {
    const today = new Date();
    let startDate = "";
    let endDate = today.toISOString().split("T")[0];

    switch (selectedPeriod) {
      case "current":
        startDate = `${today.getFullYear()}-${String(
          today.getMonth() + 1,
        ).padStart(2, "0")}-01`;
        break;
      case "last3":
        const last3Months = new Date();
        last3Months.setMonth(last3Months.getMonth() - 3);
        startDate = last3Months.toISOString().split("T")[0];
        break;
      case "last6":
        const last6Months = new Date();
        last6Months.setMonth(last6Months.getMonth() - 6);
        startDate = last6Months.toISOString().split("T")[0];
        break;
      case "year":
        startDate = `${new Date().getFullYear()}-01-01`;
        break;
      case "custom":
        startDate = customStartDate;
        endDate = customEndDate;
        break;
    }

    return { startDate, endDate };
  }, [selectedPeriod, customStartDate, customEndDate]);

  const loadReports = useCallback(async () => {
    if (!user) return;
    if (selectedPeriod === "custom" && (!customStartDate || !customEndDate))
      return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange;

      // Fetch client statistics - only get needed fields
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, status")
        .eq("user_id", user.id);

      if (clientsError) throw clientsError;

      // Calculate stats
      const activeClients =
        clients?.filter((c) => c.status === "active").length || 0;
      const totalClients = clients?.length || 0;

      // Fetch KES transactions - only needed fields
      const { data: kesTransactions, error: kesError } = await supabase
        .from("client_transactions_kes")
        .select(
          `
          id,
          client_id,
          debit,
          credit,
          transaction_date,
          clients!inner(user_id, client_name, client_code)
        `,
        )
        .eq("clients.user_id", user.id)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate);

      if (kesError) throw kesError;

      // Fetch USD transactions - only needed fields
      const { data: usdTransactions, error: usdError } = await supabase
        .from("client_transactions_usd")
        .select(
          `
          id,
          client_id,
          debit,
          credit,
          transaction_date,
          clients!inner(user_id, client_name, client_code)
        `,
        )
        .eq("clients.user_id", user.id)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate);

      if (usdError) throw usdError;

      // Calculate totals
      const totalKES =
        kesTransactions?.reduce(
          (sum, t) => sum + (t.credit || 0) - (t.debit || 0),
          0,
        ) || 0;

      const totalUSD =
        usdTransactions?.reduce(
          (sum, t) => sum + (t.credit || 0) - (t.debit || 0),
          0,
        ) || 0;

      setClientStats({
        totalClients,
        activeClients,
        inactiveClients: totalClients - activeClients,
        totalBalanceKES: totalKES,
        totalBalanceUSD: totalUSD,
        totalTransactions:
          (kesTransactions?.length || 0) + (usdTransactions?.length || 0),
      });

      // Calculate top clients
      const clientMap = new Map<string, TopClient>();

      kesTransactions?.forEach((t) => {
        const key = t.client_id;
        if (!clientMap.has(key)) {
          const clientData = Array.isArray(t.clients)
            ? t.clients[0]
            : t.clients;
          clientMap.set(key, {
            client_id: t.client_id,
            client_name: clientData?.client_name || "",
            client_code: clientData?.client_code || "",
            total_balance_kes: 0,
            total_balance_usd: 0,
            transaction_count: 0,
          });
        }
        const client = clientMap.get(key)!;
        client.total_balance_kes += (t.credit || 0) - (t.debit || 0);
        client.transaction_count += 1;
      });

      usdTransactions?.forEach((t) => {
        const key = t.client_id;
        if (!clientMap.has(key)) {
          const clientData = Array.isArray(t.clients)
            ? t.clients[0]
            : t.clients;
          clientMap.set(key, {
            client_id: t.client_id,
            client_name: clientData?.client_name || "",
            client_code: clientData?.client_code || "",
            total_balance_kes: 0,
            total_balance_usd: 0,
            transaction_count: 0,
          });
        }
        const client = clientMap.get(key)!;
        client.total_balance_usd += (t.credit || 0) - (t.debit || 0);
        client.transaction_count += 1;
      });

      const topClientsList = Array.from(clientMap.values())
        .sort((a, b) => {
          const aTotal = a.total_balance_kes + a.total_balance_usd * 130; // Rough conversion
          const bTotal = b.total_balance_kes + b.total_balance_usd * 130;
          return bTotal - aTotal;
        })
        .slice(0, 10);

      setTopClients(topClientsList);

      // Calculate monthly trends
      const monthlyMap = new Map<string, MonthlyTrend>();

      kesTransactions?.forEach((t) => {
        const month = t.transaction_date.substring(0, 7); // YYYY-MM
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            transactions_kes: 0,
            transactions_usd: 0,
            balance_kes: 0,
            balance_usd: 0,
          });
        }
        const trend = monthlyMap.get(month)!;
        trend.transactions_kes += 1;
        trend.balance_kes += (t.credit || 0) - (t.debit || 0);
      });

      usdTransactions?.forEach((t) => {
        const month = t.transaction_date.substring(0, 7);
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            transactions_kes: 0,
            transactions_usd: 0,
            balance_kes: 0,
            balance_usd: 0,
          });
        }
        const trend = monthlyMap.get(month)!;
        trend.transactions_usd += 1;
        trend.balance_usd += (t.credit || 0) - (t.debit || 0);
      });

      const trends = Array.from(monthlyMap.values()).sort((a, b) =>
        a.month.localeCompare(b.month),
      );

      setMonthlyTrends(trends);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user, getDateRange, selectedPeriod, customStartDate, customEndDate]);

  const exportToPDF = async () => {
    try {
      toast.info("Generating PDF report...");

      // Import jsPDF dynamically
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 15;

      // Header with gradient effect
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 40, "F");

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Dinix - Financial Report", pageWidth / 2, 20, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const periodText =
        selectedPeriod === "custom"
          ? `${customStartDate} to ${customEndDate}`
          : selectedPeriod === "current"
            ? "Current Month"
            : selectedPeriod === "last3"
              ? "Last 3 Months"
              : selectedPeriod === "last6"
                ? "Last 6 Months"
                : "This Year";
      doc.text(`Period: ${periodText}`, pageWidth / 2, 30, { align: "center" });

      yPosition = 50;

      // Summary Statistics
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Statistics", 14, yPosition);
      yPosition += 10;

      const summaryData = [
        ["Metric", "Value"],
        ["Total Clients", clientStats.totalClients.toString()],
        ["Active Clients", clientStats.activeClients.toString()],
        ["Total Transactions", clientStats.totalTransactions.toString()],
        [
          "Balance (KES)",
          `KES ${clientStats.totalBalanceKES.toLocaleString()}`,
        ],
        [
          "Balance (USD)",
          `USD ${clientStats.totalBalanceUSD.toLocaleString()}`,
        ],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: "grid",
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        margin: { left: 14, right: 14 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Top Clients
      if (topClients.length > 0) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Top 10 Clients", 14, yPosition);
        yPosition += 10;

        const topClientsData = topClients.map((client) => [
          client.client_name,
          client.client_code,
          `KES ${client.total_balance_kes.toLocaleString()}`,
          `USD ${client.total_balance_usd.toLocaleString()}`,
          client.transaction_count.toString(),
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [
            [
              "Client Name",
              "Code",
              "Balance (KES)",
              "Balance (USD)",
              "Transactions",
            ],
          ],
          body: topClientsData,
          theme: "striped",
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }

      // Save PDF
      const filename = `Dinix_Financial_Report_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(filename);
      toast.success(`PDF report exported successfully: ${filename}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(
        `Failed to generate PDF report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const exportToExcel = () => {
    try {
      // Create CSV content
      let csvContent = "Dinix - Financial Report\n";
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Summary section
      csvContent += "SUMMARY STATISTICS\n";
      csvContent += `Total Clients,${clientStats.totalClients}\n`;
      csvContent += `Active Clients,${clientStats.activeClients}\n`;
      csvContent += `Inactive Clients,${clientStats.inactiveClients}\n`;
      csvContent += `Total Transactions,${clientStats.totalTransactions}\n`;
      csvContent += `Total Balance (KES),${clientStats.totalBalanceKES}\n`;
      csvContent += `Total Balance (USD),${clientStats.totalBalanceUSD}\n\n`;

      // Top clients section
      if (topClients.length > 0) {
        csvContent += "TOP CLIENTS\n";
        csvContent +=
          "Client Name,Client Code,Balance (KES),Balance (USD),Transaction Count\n";
        topClients.forEach((client) => {
          csvContent += `"${client.client_name}",${client.client_code},${client.total_balance_kes},${client.total_balance_usd},${client.transaction_count}\n`;
        });
        csvContent += "\n";
      }

      // Monthly trends section
      if (monthlyTrends.length > 0) {
        csvContent += "MONTHLY TRENDS\n";
        csvContent +=
          "Month,Transactions (KES),Transactions (USD),Balance (KES),Balance (USD)\n";
        monthlyTrends.forEach((trend) => {
          csvContent += `${trend.month},${trend.transactions_kes},${trend.transactions_usd},${trend.balance_kes},${trend.balance_usd}\n`;
        });
      }

      // Create and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Dinix_Report_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error(
        `Failed to export to Excel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Ezary CMS Branded Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-200 transform hover:shadow-3xl transition-all duration-300">
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full -mr-32 -mt-32 animate-pulse"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-3">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/30">
                    <span className="text-white font-bold text-2xl">E</span>
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                      Analytics & Reports
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base mt-1 font-medium">
                      Dinix • Comprehensive Client Analytics
                    </p>
                  </div>
                </div>
              </div>
              <FileText className="w-16 h-16 text-white/30" />
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Report Period</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <button
              onClick={() => setSelectedPeriod("current")}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 ${
                selectedPeriod === "current"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod("last3")}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 ${
                selectedPeriod === "last3"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              <span className="hidden sm:inline">Last 3 Months</span>
              <span className="sm:hidden">3 Mo</span>
            </button>
            <button
              onClick={() => setSelectedPeriod("last6")}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 ${
                selectedPeriod === "last6"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              <span className="hidden sm:inline">Last 6 Months</span>
              <span className="sm:hidden">6 Mo</span>
            </button>
            <button
              onClick={() => setSelectedPeriod("year")}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 ${
                selectedPeriod === "year"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setSelectedPeriod("custom")}
              className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 active:scale-95 ${
                selectedPeriod === "custom"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              Custom
            </button>
          </div>

          {selectedPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-3 mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Export Actions - NEW */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Download className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Export Options
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={exportToPDF}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export Excel
            </button>
            <button
              onClick={printReport}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Currency Filter - Ultra Modern */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Currency View
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => setSelectedCurrency("BOTH")}
              className={`px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 active:scale-95 ${
                selectedCurrency === "BOTH"
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white shadow-2xl shadow-blue-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-blue-400"
              }`}
            >
              🌍 Both Currencies
            </button>
            <button
              onClick={() => setSelectedCurrency("KES")}
              className={`px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 active:scale-95 ${
                selectedCurrency === "KES"
                  ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-emerald-400"
              }`}
            >
              🇰🇪 KES Only
            </button>
            <button
              onClick={() => setSelectedCurrency("USD")}
              className={`px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 active:scale-95 ${
                selectedCurrency === "USD"
                  ? "bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 text-white shadow-2xl shadow-purple-300/50 scale-105"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-50 hover:shadow-lg border-2 border-gray-200 hover:border-purple-400"
              }`}
            >
              🇺🇸 USD Only
            </button>
          </div>
        </div>

        {/* Summary Stats - Ultra Modern 3D Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 xl:gap-6">
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-2xl hover:shadow-3xl hover:shadow-emerald-300/50 transition-all duration-300 transform hover:scale-105 active:scale-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:rotate-12 transition-transform">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="text-3xl sm:text-4xl font-black opacity-30">
                  {clientStats.totalClients}
                </span>
              </div>
              <p className="text-white/90 text-xs sm:text-sm font-semibold uppercase tracking-wide">
                Total Clients
              </p>
              <p className="text-2xl sm:text-3xl font-black mt-2 drop-shadow-lg">
                {clientStats.totalClients}
              </p>
              <p className="text-xs sm:text-sm text-white/80 mt-3 font-medium">
                ✓ {clientStats.activeClients} active • ⊘{" "}
                {clientStats.inactiveClients} inactive
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <CreditCard className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
                KES
              </span>
            </div>
            <p className="text-blue-100 text-sm">Total Balance (KES)</p>
            <p className="text-2xl font-bold mt-1">
              KSh {clientStats.totalBalanceKES.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-10 h-10 opacity-80" />
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
                USD
              </span>
            </div>
            <p className="text-purple-100 text-sm">Total Balance (USD)</p>
            <p className="text-2xl font-bold mt-1">
              ${clientStats.totalBalanceUSD.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-10 h-10 opacity-80" />
              <BarChart3 className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-cyan-100 text-sm">Total Transactions</p>
            <p className="text-2xl font-bold mt-1">
              {clientStats.totalTransactions}
            </p>
            <p className="text-xs text-cyan-100 mt-2">In selected period</p>
          </div>
        </div>

        {/* Top Clients */}
        {topClients.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Top Clients by Balance
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div
                  key={client.client_id}
                  className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl hover:shadow-md transition-all border border-gray-200"
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-500"
                          : index === 1
                            ? "bg-gradient-to-br from-gray-400 to-gray-500"
                            : index === 2
                              ? "bg-gradient-to-br from-orange-400 to-orange-500"
                              : "bg-gradient-to-br from-emerald-400 to-emerald-500"
                      }`}
                    >
                      #{index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {client.client_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {client.client_code}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "KES") &&
                      client.total_balance_kes !== 0 && (
                        <p className="font-bold text-emerald-600">
                          KSh {client.total_balance_kes.toLocaleString()}
                        </p>
                      )}
                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "USD") &&
                      client.total_balance_usd !== 0 && (
                        <p className="font-bold text-purple-600">
                          ${client.total_balance_usd.toLocaleString()}
                        </p>
                      )}
                    <p className="text-xs text-gray-500 mt-1">
                      {client.transaction_count}{" "}
                      {client.transaction_count === 1
                        ? "transaction"
                        : "transactions"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Trends */}
        {monthlyTrends.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Monthly Transaction Trends
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">
                      Month
                    </th>
                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "KES") && (
                      <>
                        <th className="text-right py-3 px-4 font-semibold text-emerald-600">
                          KES Trans.
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-emerald-600">
                          KES Balance
                        </th>
                      </>
                    )}
                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "USD") && (
                      <>
                        <th className="text-right py-3 px-4 font-semibold text-purple-400">
                          USD Trans.
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-purple-400">
                          USD Balance
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {monthlyTrends.map((trend) => (
                    <tr
                      key={trend.month}
                      className="border-b border-gray-200 hover:bg-white/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-white">
                        {new Date(trend.month + "-01").toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>
                      {(selectedCurrency === "BOTH" ||
                        selectedCurrency === "KES") && (
                        <>
                          <td className="text-right py-3 px-4 text-gray-600">
                            {trend.transactions_kes}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold text-emerald-600">
                            KSh {trend.balance_kes.toLocaleString()}
                          </td>
                        </>
                      )}
                      {(selectedCurrency === "BOTH" ||
                        selectedCurrency === "USD") && (
                        <>
                          <td className="text-right py-3 px-4 text-gray-600">
                            {trend.transactions_usd}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold text-purple-400">
                            ${trend.balance_usd.toLocaleString()}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {clientStats.totalClients === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600 mb-6">
              Start adding clients and transactions to see analytics and reports
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
