// PDF Report Generation Utilities for Dinix General Trading
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./currency";

interface Client {
  client_name: string;
  client_code: string;
  email: string | null;
  phone: string | null;
  business_name: string | null;
  address: string | null;
}

interface Transaction {
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
}

interface ReportOptions {
  client: Client;
  transactionsKES: Transaction[];
  transactionsUSD: Transaction[];
  summaryKES: { receivable: number; paid: number; balance: number };
  summaryUSD: { receivable: number; paid: number; balance: number };
  reportType: "full" | "summary" | "kes-only" | "usd-only";
}

// Optional handler to customize what happens with the generated PDF
// If provided, we won't call doc.save and will instead pass back the jsPDF
// instance and filename so the caller can download, upload, or share it.
export const generateClientPDFReport = (
  options: ReportOptions,
  onDocReady?: (doc: jsPDF, fileName: string) => void,
) => {
  try {
    const {
      client,
      transactionsKES,
      transactionsUSD,
      summaryKES,
      summaryUSD,
      reportType,
    } = options;

    // Portrait A4 — prints correctly on any printer without rotation
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const ML = 10; // left margin
    const MR = 10; // right margin

    // Decide which sections to show — skip any currency with no transactions
    const showKES =
      (reportType === "full" ||
        reportType === "kes-only" ||
        reportType === "summary") &&
      transactionsKES.length > 0;
    const showUSD =
      (reportType === "full" || reportType === "usd-only") &&
      transactionsUSD.length > 0;

    // ─── HEADER BAND ────────────────────────────────────────────────────────
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 26, "F");

    // Company name — top left
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DINIX GENERAL TRADING", ML, 10);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 255, 240);
    doc.text("ACCOUNT STATEMENT", ML, 16);

    // Statement date below subtitle
    const stmtDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    doc.setFontSize(8);
    doc.setTextColor(180, 255, 220);
    doc.text(`Date: ${stmtDate}`, ML, 22);

    // Client info — right side of header
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(client.client_name, pageWidth - MR, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 255, 240);
    doc.text(`Account: ${client.client_code}`, pageWidth - MR, 16, {
      align: "right",
    });
    if (client.phone) {
      doc.text(`Tel: ${client.phone}`, pageWidth - MR, 22, { align: "right" });
    }

    let yPosition = 31;

    // ─── HELPERS ────────────────────────────────────────────────────────────

    // Thin Excel-style border colour
    const BORDER: [number, number, number] = [160, 160, 160];
    const HEAD_GREEN: [number, number, number] = [16, 185, 129];
    const HEAD_BLUE: [number, number, number] = [59, 130, 246];
    const FOOT_BG: [number, number, number] = [240, 240, 240];

    function buildTableData(txns: Transaction[], sym: "KES" | "USD") {
      // Sort oldest → newest for natural reading; running balance goes top-down
      const sorted = [...txns].sort(
        (a, b) =>
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime(),
      );
      let runBal = 0;
      return sorted.map((t) => {
        const inAmt = t.credit || 0;
        const outAmt = t.debit || 0;
        runBal += inAmt - outAmt;
        return [
          new Date(t.transaction_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          t.description || "",
          inAmt > 0 ? formatCurrency(inAmt, sym) : "-",
          outAmt > 0 ? formatCurrency(outAmt, sym) : "-",
          (runBal < 0 ? "-" : "") + formatCurrency(Math.abs(runBal), sym),
        ];
      });
    }

    function renderSection(
      label: string,
      txns: Transaction[],
      sym: "KES" | "USD",
      summary: { receivable: number; paid: number; balance: number },
      headColor: [number, number, number],
    ) {
      // Section label
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(headColor[0], headColor[1], headColor[2]);
      doc.text(label, ML, yPosition);
      yPosition += 4;

      const rows = buildTableData(txns, sym);
      const footBal =
        (summary.balance < 0 ? "-" : "") +
        formatCurrency(Math.abs(summary.balance), sym);
      const footRow = [
        "",
        "BALANCE",
        formatCurrency(summary.paid, sym),
        formatCurrency(summary.receivable, sym),
        footBal,
      ];

      // MG / Mileage count — calculated before the table so it can go in the footer
      const mgCount = txns.filter((t) =>
        /\bmg\b/i.test(t.description || ""),
      ).length;
      const mgRow = [
        "",
        `Mileage (MG) Count: ${mgCount} trip${mgCount !== 1 ? "s" : ""}`,
        "",
        "",
        "",
      ];

      // Portrait A4 table width = 190mm (210 - 10 - 10)
      // date=26, desc=62, in=34, out=34, bal=34  → total=190
      autoTable(doc, {
        startY: yPosition,
        head: [["Date", "Description", "Money IN", "Money OUT", "Balance"]],
        body: rows,
        foot: [footRow, mgRow],
        showFoot: "lastPage",
        theme: "grid",
        headStyles: {
          fillColor: headColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 2.2,
          lineColor: BORDER,
          lineWidth: 0.2,
        },
        footStyles: {
          fillColor: FOOT_BG,
          textColor: [30, 30, 30],
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 2.2,
          lineColor: BORDER,
          lineWidth: 0.3,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2,
          lineColor: BORDER,
          lineWidth: 0.2,
          textColor: [30, 30, 30],
          overflow: "linebreak",
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold" },
          1: { cellWidth: 62 },
          2: {
            cellWidth: 34,
            halign: "right",
            textColor: [5, 150, 105],
            fontStyle: "bold",
          },
          3: {
            cellWidth: 34,
            halign: "right",
            textColor: [220, 38, 38],
            fontStyle: "bold",
          },
          4: {
            cellWidth: 34,
            halign: "right",
            fontStyle: "bold",
            textColor: summary.balance >= 0 ? [6, 90, 172] : [200, 30, 30],
          },
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: ML, right: MR },
        showHead: "everyPage",
        rowPageBreak: "avoid",
      });

      yPosition = (doc as any).lastAutoTable.finalY + 6;
    }

    // ─── RENDER SECTIONS ────────────────────────────────────────────────────
    if (showKES) {
      renderSection(
        "TRANSACTION HISTORY — KES (Kenyan Shillings)",
        transactionsKES,
        "KES",
        summaryKES,
        HEAD_GREEN,
      );
    }
    if (showUSD) {
      renderSection(
        "TRANSACTION HISTORY — USD (US Dollars)",
        transactionsUSD,
        "USD",
        summaryUSD,
        HEAD_BLUE,
      );
    }
    if (!showKES && !showUSD) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130, 130, 130);
      doc.text("No transactions recorded.", ML, yPosition + 10);
    }

    // ─── FOOTER ON EVERY PAGE ───────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.line(ML, pageHeight - 8, pageWidth - MR, pageHeight - 8);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("Dinix General Trading — Confidential", ML, pageHeight - 4);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 4, {
        align: "center",
      });
      doc.text(stmtDate, pageWidth - MR, pageHeight - 4, { align: "right" });
    }

    // Finalize the PDF
    const fileName = `Dinix_Statement_${client.client_code}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    // If a handler is provided, let the caller decide what to do
    if (onDocReady) {
      onDocReady(doc, fileName);
    } else {
      // Default behavior: trigger a normal download in the browser
      doc.save(fileName);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error(
      `PDF generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};

// Generate a combined statement for one or more clients in a single PDF
// All KES transactions are merged into one KES table and all USD
// transactions are merged into one USD table.
export const generateCombinedClientsPDFReport = (
  options: {
    clients: {
      client: Client;
      transactionsKES: Transaction[];
      transactionsUSD: Transaction[];
    }[];
  },
  onDocReady?: (doc: jsPDF, fileName: string) => void,
) => {
  const { clients } = options;

  if (!clients || clients.length === 0) {
    throw new Error("No clients provided for combined statement");
  }

  // Combined client for header/footer
  const allNames = clients.map((c) => c.client.client_name);
  const allCodes = clients.map((c) => c.client.client_code);

  const displayName =
    allNames.length <= 2
      ? allNames.join(" & ")
      : `${allNames.slice(0, 2).join(" & ")} + ${allNames.length - 2} more`;

  const combinedClient: Client = {
    client_name: displayName,
    client_code: allCodes.join(" + "),
    email: null,
    phone: null,
    business_name: null,
    address: null,
  };

  // Combine all transactions while preserving their original descriptions
  const allKES: Transaction[] = [];
  const allUSD: Transaction[] = [];

  clients.forEach(({ client, transactionsKES, transactionsUSD }) => {
    transactionsKES.forEach((t) => {
      const baseDescription = t.description || "";
      allKES.push({
        ...t,
        description: baseDescription
          ? `${client.client_name} - ${baseDescription}`
          : client.client_name,
      });
    });

    transactionsUSD.forEach((t) => {
      const baseDescription = t.description || "";
      allUSD.push({
        ...t,
        description: baseDescription
          ? `${client.client_name} - ${baseDescription}`
          : client.client_name,
      });
    });
  });

  // Sort combined transactions by date
  const combinedKES = allKES.sort(
    (a, b) =>
      new Date(a.transaction_date).getTime() -
      new Date(b.transaction_date).getTime(),
  );

  const combinedUSD = allUSD.sort(
    (a, b) =>
      new Date(a.transaction_date).getTime() -
      new Date(b.transaction_date).getTime(),
  );

  const calculateSummary = (txns: Transaction[]) => {
    let paid = 0;
    let receivable = 0;

    txns.forEach((t) => {
      paid += t.credit || 0;
      receivable += t.debit || 0;
    });

    const balance = paid - receivable;
    return { paid, receivable, balance };
  };

  const summaryKES = calculateSummary(combinedKES);
  const summaryUSD = calculateSummary(combinedUSD);

  return generateClientPDFReport(
    {
      client: combinedClient,
      transactionsKES: combinedKES,
      transactionsUSD: combinedUSD,
      summaryKES,
      summaryUSD,
      reportType: "full",
    },
    onDocReady,
  );
};

// Generate summary report for all clients
export const generateAllClientsSummaryPDF = (
  clients: Array<{
    client_name: string;
    client_code: string;
    balanceKES: number;
    balanceUSD: number;
    status: string;
  }>,
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Modern Gradient Header Background
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Accent stripe
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 0, pageWidth, 5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("ALL CLIENTS SUMMARY REPORT", pageWidth / 2, 22, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(240, 253, 244);
  doc.text(
    `Dinix General Trading • Professional Financial Overview`,
    pageWidth / 2,
    34,
    {
      align: "center",
    },
  );

  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} at ${new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    pageWidth / 2,
    43,
    { align: "center" },
  );

  // Modern Table with gradient headers
  const tableData = clients.map((c) => [
    c.client_code,
    c.client_name,
    formatCurrency(c.balanceKES, "KES"),
    formatCurrency(c.balanceUSD, "USD"),
    c.status,
  ]);

  autoTable(doc, {
    startY: 60,
    head: [["Code", "Client Name", "Balance (KES)", "Balance (USD)", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10,
    },
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [209, 213, 219],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [71, 85, 105] },
      1: { textColor: [30, 41, 59] },
      2: { halign: "right", textColor: [5, 150, 105], fontStyle: "bold" },
      3: { halign: "right", textColor: [147, 51, 234], fontStyle: "bold" },
      4: { halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  doc.save(
    `Dinix_All_Clients_Summary_${new Date().toISOString().split("T")[0]}.pdf`,
  );
};
