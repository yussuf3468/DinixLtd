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

export const generateClientPDFReport = (options: ReportOptions) => {
  try {
    const {
      client,
      transactionsKES,
      transactionsUSD,
      summaryKES,
      summaryUSD,
      reportType,
    } = options;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // Ultra-Modern Gradient Header Background
    doc.setFillColor(16, 185, 129); // Emerald-600
    doc.rect(0, 0, pageWidth, 40, "F");

    // Modern Header - Dinix General Trading Branding
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("DINIX GENERAL TRADING", 15, 14);

    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("ACCOUNT STATEMENT", 15, 24);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(240, 253, 244); // Emerald-50
    doc.text("Complete Transaction History & Financial Summary", 15, 31);

    // Report date
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Statement Date: ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      15,
      35,
    );

    yPosition = 48;

    // Modern Client Info Card
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(15, yPosition, pageWidth - 30, 28, 3, 3, "F");

    // Border accent
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, yPosition, pageWidth - 30, 28, 3, 3, "S");

    yPosition += 6;

    // "CLIENT INFORMATION" label
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("CLIENT INFORMATION", 20, yPosition);

    yPosition += 6;

    // Client Name
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(client.client_name, 20, yPosition);

    yPosition += 6;

    // Client Code
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Account Number: ${client.client_code}`, 20, yPosition);

    yPosition += 5;

    // Client details
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // Slate-600
    if (client.phone) {
      doc.text(`Contact: ${client.phone}`, 20, yPosition);
    }

    yPosition += 12;

    // Financial Summary Section with modern 3D cards
    if (reportType !== "kes-only" && reportType !== "usd-only") {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129); // Emerald-600
      doc.text("ACCOUNT SUMMARY", 15, yPosition);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Your current financial position at a glance",
        15,
        yPosition + 5,
      );
      yPosition += 12;

      const boxWidth = (pageWidth - 40) / 3;
      const boxHeight = 30;

      // Total IN box - Modern Emerald Design
      // Shadow effect
      doc.setFillColor(209, 213, 219); // Gray-300
      doc.roundedRect(15.5, yPosition + 0.5, boxWidth, boxHeight, 4, 4, "F");
      // Main box
      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.roundedRect(15, yPosition, boxWidth, boxHeight, 4, 4, "F");
      // Border
      doc.setDrawColor(167, 243, 208); // Emerald-300
      doc.setLineWidth(1);
      doc.roundedRect(15, yPosition, boxWidth, boxHeight, 4, 4, "S");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("MONEY RECEIVED", 20, yPosition + 8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 145);
      doc.text("(Total Payments In)", 20, yPosition + 13);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105); // Emerald-700
      doc.text(
        `KES ${formatCurrency(summaryKES.paid, "KES")}`,
        20,
        yPosition + 21,
      );

      // Total OUT box - Modern Red Design
      // Shadow effect
      doc.setFillColor(209, 213, 219);
      doc.roundedRect(
        20.5 + boxWidth,
        yPosition + 0.5,
        boxWidth,
        boxHeight,
        4,
        4,
        "F",
      );
      // Main box
      doc.setFillColor(254, 242, 242); // Red-50
      doc.roundedRect(20 + boxWidth, yPosition, boxWidth, boxHeight, 4, 4, "F");
      // Border
      doc.setDrawColor(252, 165, 165); // Red-300
      doc.setLineWidth(1);
      doc.roundedRect(20 + boxWidth, yPosition, boxWidth, boxHeight, 4, 4, "S");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("MONEY PAID OUT", 25 + boxWidth, yPosition + 8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 145);
      doc.text("(Total Withdrawals)", 25 + boxWidth, yPosition + 13);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red-700
      doc.text(
        `KES ${formatCurrency(summaryKES.receivable, "KES")}`,
        25 + boxWidth,
        yPosition + 21,
      );

      // Net Balance box - Modern Blue/Teal Design
      // Shadow effect
      doc.setFillColor(209, 213, 219);
      doc.roundedRect(
        25.5 + boxWidth * 2,
        yPosition + 0.5,
        boxWidth,
        boxHeight,
        4,
        4,
        "F",
      );
      // Main box
      doc.setFillColor(240, 249, 255); // Blue-50
      doc.roundedRect(
        25 + boxWidth * 2,
        yPosition,
        boxWidth,
        boxHeight,
        4,
        4,
        "F",
      );
      // Border
      const balanceColor =
        summaryKES.balance >= 0 ? [103, 232, 249] : [252, 165, 165]; // Cyan-300 or Red-300
      doc.setDrawColor(balanceColor[0], balanceColor[1], balanceColor[2]);
      doc.setLineWidth(1);
      doc.roundedRect(
        25 + boxWidth * 2,
        yPosition,
        boxWidth,
        boxHeight,
        4,
        4,
        "S",
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("CURRENT BALANCE", 30 + boxWidth * 2, yPosition + 8);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 145);
      const balanceStatusKES =
        summaryKES.balance >= 0 ? "(Credit)" : "(Outstanding)";
      doc.text(balanceStatusKES, 30 + boxWidth * 2, yPosition + 13);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      if (summaryKES.balance >= 0) {
        doc.setTextColor(6, 182, 212); // Cyan-600
      } else {
        doc.setTextColor(220, 38, 38); // Red-700
      }
      doc.text(
        `KES ${formatCurrency(Math.abs(summaryKES.balance), "KES")}`,
        30 + boxWidth * 2,
        yPosition + 21,
      );

      // USD Balance - simplified format
      doc.setFontSize(10);
      if (summaryUSD.balance >= 0) {
        doc.setTextColor(6, 182, 212); // Cyan-600
      } else {
        doc.setTextColor(220, 38, 38); // Red-700
      }
      const usdSign = summaryUSD.balance >= 0 ? "" : "-";
      doc.text(
        `${usdSign}$${formatCurrency(
          Math.abs(summaryUSD.balance),
          "USD",
        ).replace(/[^0-9.,]/g, "")}`,
        30 + boxWidth * 2,
        yPosition + 26,
      );

      yPosition += boxHeight + 8;

      // Add explanation note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      if (summaryKES.balance >= 0 && summaryUSD.balance >= 0) {
        doc.text(
          "✓ You have positive balances (money available)",
          15,
          yPosition,
        );
      } else if (summaryKES.balance < 0 || summaryUSD.balance < 0) {
        doc.text("⚠ You have outstanding balances (money owed)", 15, yPosition);
      }
      yPosition += 10;
    }

    // KES Transactions
    if (
      reportType === "full" ||
      reportType === "kes-only" ||
      reportType === "summary"
    ) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("TRANSACTION HISTORY - KES", 15, yPosition);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Detailed record of all your transactions in Kenyan Shillings",
        15,
        yPosition + 4,
      );
      yPosition += 7;

      if (transactionsKES.length > 0) {
        // Calculate running balance for each transaction (newest first, showing current balance at top)
        const totalBalance = transactionsKES.reduce(
          (sum, t) => sum + (t.credit || 0) - (t.debit || 0),
          0,
        );

        let currentBalance = totalBalance;
        const kesTableData = transactionsKES.map((t) => {
          const inAmount = t.credit || 0;
          const outAmount = t.debit || 0;
          const balanceBeforeTransaction = currentBalance;
          currentBalance -= inAmount - outAmount;

          return [
            new Date(t.transaction_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            t.description,
            inAmount > 0 ? `${formatCurrency(inAmount, "KES")}` : "-",
            outAmount > 0 ? `${formatCurrency(outAmount, "KES")}` : "-",
            `${balanceBeforeTransaction >= 0 ? "" : "-"}${formatCurrency(
              Math.abs(balanceBeforeTransaction),
              "KES",
            )}`,
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [
            ["Date", "Description", "Money IN", "Money OUT", "Running Balance"],
          ],
          body: kesTableData,
          theme: "striped",
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.5,
            halign: "left",
            cellPadding: 2,
          },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [209, 213, 219],
            lineWidth: 0.3,
            overflow: "linebreak",
            cellWidth: "wrap",
            minCellHeight: 8,
          },
          columnStyles: {
            0: {
              cellWidth: 25,
              fontStyle: "bold",
              textColor: [71, 85, 105],
              overflow: "linebreak",
            },
            1: {
              cellWidth: 75,
              textColor: [30, 41, 59],
              overflow: "linebreak",
            },
            2: {
              cellWidth: 28,
              halign: "right",
              textColor: [5, 150, 105],
              fontStyle: "bold",
            },
            3: {
              cellWidth: 28,
              halign: "right",
              textColor: [220, 38, 38],
              fontStyle: "bold",
            },
            4: {
              cellWidth: 30,
              halign: "right",
              fontStyle: "bold",
              textColor: [6, 182, 212],
            },
          },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          margin: { top: 10, bottom: 20, left: 10, right: 10 },
          didDrawPage: (data) => {
            // Ensure page breaks don't cut through rows
            if (data.cursor) {
              const bottomMargin = 20;
              if (data.cursor.y > pageHeight - bottomMargin) {
                data.cursor.y = 15; // Reset to top of new page
              }
            }
          },
          showHead: "everyPage",
          rowPageBreak: "avoid",
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;

        // Add helpful note about the balance
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(
          "Note: Running Balance shows your account position after each transaction (newest first)",
          15,
          yPosition,
        );
        yPosition += 15;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(
          "No transactions recorded in Kenyan Shillings",
          15,
          yPosition + 10,
        );
        yPosition += 25;
      }
    }

    // USD Transactions
    if (reportType === "full" || reportType === "usd-only") {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246); // Blue-500
      doc.text("TRANSACTION HISTORY - USD", 15, yPosition);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Detailed record of all your transactions in US Dollars",
        15,
        yPosition + 4,
      );
      yPosition += 7;

      if (transactionsUSD.length > 0) {
        // Calculate running balance for each transaction (newest first, showing current balance at top)
        const totalBalance = transactionsUSD.reduce(
          (sum, t) => sum + (t.credit || 0) - (t.debit || 0),
          0,
        );

        let currentBalance = totalBalance;
        const usdTableData = transactionsUSD.map((t) => {
          const inAmount = t.credit || 0;
          const outAmount = t.debit || 0;
          const balanceBeforeTransaction = currentBalance;
          currentBalance -= inAmount - outAmount;

          return [
            new Date(t.transaction_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            t.description,
            inAmount > 0 ? `${formatCurrency(inAmount, "USD")}` : "-",
            outAmount > 0 ? `${formatCurrency(outAmount, "USD")}` : "-",
            `${balanceBeforeTransaction >= 0 ? "" : "-"}${formatCurrency(
              Math.abs(balanceBeforeTransaction),
              "USD",
            )}`,
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [
            ["Date", "Description", "Money IN", "Money OUT", "Running Balance"],
          ],
          body: usdTableData,
          theme: "striped",
          headStyles: {
            fillColor: [59, 130, 246], // Blue-500
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.5,
            halign: "left",
            cellPadding: 2,
          },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [209, 213, 219],
            lineWidth: 0.3,
            overflow: "linebreak",
            cellWidth: "wrap",
            minCellHeight: 8,
          },
          columnStyles: {
            0: {
              cellWidth: 25,
              fontStyle: "bold",
              textColor: [71, 85, 105],
              overflow: "linebreak",
            },
            1: {
              cellWidth: 75,
              textColor: [30, 41, 59],
              overflow: "linebreak",
            },
            2: {
              cellWidth: 28,
              halign: "right",
              textColor: [5, 150, 105],
              fontStyle: "bold",
            },
            3: {
              cellWidth: 28,
              halign: "right",
              textColor: [220, 38, 38],
              fontStyle: "bold",
            },
            4: {
              cellWidth: 30,
              halign: "right",
              fontStyle: "bold",
              textColor: [59, 130, 246], // Blue-500
            },
          },
          alternateRowStyles: { fillColor: [239, 246, 255] }, // Blue-50
          margin: { top: 10, bottom: 20, left: 10, right: 10 },
          didDrawPage: (data) => {
            // Ensure page breaks don't cut through rows
            if (data.cursor) {
              const bottomMargin = 20;
              if (data.cursor.y > pageHeight - bottomMargin) {
                data.cursor.y = 15; // Reset to top of new page
              }
            }
          },
          showHead: "everyPage",
          rowPageBreak: "avoid",
        });

        yPosition = (doc as any).lastAutoTable.finalY + 6;

        // Add helpful note about the balance
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(
          "Note: Running Balance shows your account position after each transaction (newest first)",
          15,
          yPosition,
        );
        yPosition += 10;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text("No transactions recorded in US Dollars", 15, yPosition + 10);
        yPosition += 20;
      }
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Modern Footer with gradient accent
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1);
      doc.line(15, pageHeight - 22, pageWidth - 15, pageHeight - 22);

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 21, pageWidth - 15, pageHeight - 21);

      // Footer text
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 12, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.text(client.client_name, 15, pageHeight - 12);
      doc.text(
        `Account: ${client.client_code}`,
        pageWidth - 15,
        pageHeight - 12,
        {
          align: "right",
        },
      );

      // Add contact info in footer
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 145);
      doc.text(
        "For questions about this statement, please contact your account manager",
        pageWidth / 2,
        pageHeight - 6,
        {
          align: "center",
        },
      );
    }

    // Save the PDF
    const fileName = `Dinix_Statement_${client.client_code}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error(
      `PDF generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
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
