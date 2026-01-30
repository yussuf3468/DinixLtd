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
import { generateCombinedClientsPDFReport } from "../lib/pdfGenerator";

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
  const [selectedTopClientIds, setSelectedTopClientIds] = useState<Set<string>>(
    new Set(),
  );
  const [exportingCombined, setExportingCombined] = useState(false);

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
          description,
          debit,
          credit,
          transaction_date,
          payment_method,
          reference_number,
          notes,
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
          description,
          debit,
          credit,
          transaction_date,
          payment_method,
          reference_number,
          notes,
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

      // Cache raw transactions on window for combined export helper
      (window as any).__dinixReportTransactions = {
        kes: kesTransactions || [],
        usd: usdTransactions || [],
      };
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user, getDateRange, selectedPeriod, customStartDate, customEndDate]);

  const toggleTopClientSelection = (clientId: string) => {
    setSelectedTopClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const clearTopClientSelection = () => {
    setSelectedTopClientIds(new Set());
  };

  const exportCombinedFromReports = async () => {
    if (!user) return;
    if (selectedTopClientIds.size === 0) {
      toast.info("Select at least one top client to combine.");
      return;
    }

    try {
      setExportingCombined(true);

      const txCache = (window as any).__dinixReportTransactions || {};
      const kesTransactions = txCache.kes || [];
      const usdTransactions = txCache.usd || [];

      const selected = topClients.filter((c) =>
        selectedTopClientIds.has(c.client_id),
      );

      const clientsPayload = selected.map((c) => {
        const clientKES = kesTransactions.filter(
          (t: any) => t.client_id === c.client_id,
        );
        const clientUSD = usdTransactions.filter(
          (t: any) => t.client_id === c.client_id,
        );

        return {
          client: {
            client_name: c.client_name,
            client_code: c.client_code,
            email: null,
            phone: null,
            business_name: null,
            address: null,
          },
          transactionsKES: clientKES,
          transactionsUSD: clientUSD,
        };
      });

      if (clientsPayload.length === 0) {
        toast.info("No transactions found for the selected clients.");
        return;
      }
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
        // Use Web Share API with a real PDF file for combined statements
        generateCombinedClientsPDFReport(
          { clients: clientsPayload },
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
                  title: "Combined Account Statement",
                  text: `${clientsPayload.length} client${clientsPayload.length > 1 ? "s" : ""} • Dinix General Trading`,
                });
              } else {
                doc.save(fileName);
              }
            } catch (shareError) {
              console.error("Error sharing combined PDF:", shareError);
              toast.error(
                "Failed to share combined statement. Downloading instead.",
              );
              doc.save(fileName);
            }
          },
        );
      } else {
        // Desktop or unsupported browsers: standard browser download behaviour
        generateCombinedClientsPDFReport({ clients: clientsPayload });
      }

      toast.success(
        `Combined statement generated for ${clientsPayload.length} client${clientsPayload.length > 1 ? "s" : ""}.`,
      );
      clearTopClientSelection();
    } catch (error) {
      console.error("Error generating combined report statement:", error);
      toast.error("Failed to generate combined statement. Please try again.");
    } finally {
      setExportingCombined(false);
    }
  };

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
    <div className="p-3 sm:p-4 md:p-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Reports Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    Analytics & Reports
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                    Dinix • Overview of your clients and activity
                  </p>
                </div>
              </div>
              <FileText className="w-8 h-8 text-emerald-500/70" />
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Report Period</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <button
              onClick={() => setSelectedPeriod("current")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedPeriod === "current"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod("last3")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedPeriod === "last3"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="hidden sm:inline">Last 3 Months</span>
              <span className="sm:hidden">3 Mo</span>
            </button>
            <button
              onClick={() => setSelectedPeriod("last6")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedPeriod === "last6"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="hidden sm:inline">Last 6 Months</span>
              <span className="sm:hidden">6 Mo</span>
            </button>
            <button
              onClick={() => setSelectedPeriod("year")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedPeriod === "year"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Year
            </button>
            <button
              onClick={() => setSelectedPeriod("custom")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedPeriod === "custom"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Custom
            </button>
          </div>

          {selectedPeriod === "custom" && (
            <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-white rounded-xl border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <Calendar className="inline-block w-4 h-4 mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
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
                  className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Export Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Export Excel
            </button>
            <button
              onClick={printReport}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Currency Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedCurrency === "BOTH"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🌍 Both Currencies
            </button>
            <button
              onClick={() => setSelectedCurrency("KES")}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedCurrency === "KES"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🇰🇪 KES Only
            </button>
            <button
              onClick={() => setSelectedCurrency("USD")}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold ${
                selectedCurrency === "USD"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🇺🇸 USD Only
            </button>
          </div>
        </div>

        {/* Top Clients */}
        {topClients.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  Top Clients by Balance
                </h3>
              </div>
              {selectedTopClientIds.size > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] sm:text-xs text-gray-700 whitespace-nowrap">
                    <span className="font-semibold">
                      {selectedTopClientIds.size}
                    </span>{" "}
                    selected
                  </span>
                  <button
                    type="button"
                    onClick={exportCombinedFromReports}
                    disabled={exportingCombined}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                  >
                    <FileText className="w-3 h-3" />
                    {exportingCombined ? "Generating..." : "Combined"}
                  </button>
                  <button
                    type="button"
                    onClick={clearTopClientSelection}
                    className="text-[11px] text-gray-500 hover:text-gray-800"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {topClients.map((client, index) => (
                <div
                  key={client.client_id}
                  className="p-3 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-white text-xs shadow-sm ${
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
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {client.client_name}
                        </p>
                        <p className="text-[11px] text-gray-600 truncate">
                          {client.client_code}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTopClientIds.has(client.client_id)}
                      onChange={() =>
                        toggleTopClientSelection(client.client_id)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer flex-shrink-0"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col gap-0.5">
                      {(selectedCurrency === "BOTH" ||
                        selectedCurrency === "KES") &&
                        client.total_balance_kes !== 0 && (
                          <span className="font-semibold text-emerald-600">
                            KSh {client.total_balance_kes.toLocaleString()}
                          </span>
                        )}
                      {(selectedCurrency === "BOTH" ||
                        selectedCurrency === "USD") &&
                        client.total_balance_usd !== 0 && (
                          <span className="font-semibold text-purple-600">
                            ${client.total_balance_usd.toLocaleString()}
                          </span>
                        )}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {client.transaction_count}{" "}
                      {client.transaction_count === 1
                        ? "transaction"
                        : "transactions"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Trends */}
        {monthlyTrends.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Monthly Transaction Trends
              </h3>
            </div>

            <div className="space-y-2.5">
              {monthlyTrends.map((trend) => (
                <div
                  key={trend.month}
                  className="p-3 rounded-xl border border-gray-200 bg-white flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(trend.month + "-01").toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "KES") && (
                      <div className="space-y-0.5">
                        <p className="text-gray-600">
                          <span className="text-gray-500 mr-1">KES Trans:</span>
                          <span className="font-semibold">
                            {trend.transactions_kes}
                          </span>
                        </p>
                        <p className="text-emerald-600 font-semibold">
                          KSh {trend.balance_kes.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {(selectedCurrency === "BOTH" ||
                      selectedCurrency === "USD") && (
                      <div className="space-y-0.5 text-right ml-auto">
                        <p className="text-gray-600">
                          <span className="text-gray-500 mr-1">USD Trans:</span>
                          <span className="font-semibold">
                            {trend.transactions_usd}
                          </span>
                        </p>
                        <p className="text-purple-500 font-semibold">
                          ${trend.balance_usd.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {clientStats.totalClients === 0 && (
          <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No Data Available
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Start adding clients and transactions to see analytics and reports
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
