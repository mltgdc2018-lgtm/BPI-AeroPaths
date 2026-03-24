import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PackingPlanResult } from "@/lib/services/packing-logic/packing.types";
import { TDocumentDefinitions, Content, Style, TableCell } from "pdfmake/interfaces";

type PdfFontFamily = {
  normal: string;
  bold: string;
  italics: string;
  bolditalics: string;
};

// --- Font Loading Helpers ---

async function fetchFont(url: string): Promise<string> {
  const response = await fetch(url);

  // เพิ่มระบบป้องกัน: ถ้าหาไฟล์ฟอนต์ไม่เจอให้แจ้งเตือนทันที
  if (!response.ok) {
    throw new Error(`ไม่พบไฟล์ฟอนต์ที่: ${url} (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  // Convert ArrayBuffer to base64 for pdfMake VFS
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getDefaultVfs(): Record<string, string> {
  const withPdfMake = pdfFonts as { pdfMake?: { vfs?: Record<string, string> } };
  return withPdfMake.pdfMake?.vfs ?? (pdfFonts as unknown as Record<string, string>);
}

async function buildVfs(): Promise<Record<string, string>> {
  const sarabunData = await fetchFont("/fonts/Sarabun-Regular.ttf");
  return {
    ...getDefaultVfs(),
    "Sarabun-Regular.ttf": sarabunData,
  };
}

function buildFonts(): Record<string, PdfFontFamily> {
  return {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
    Sarabun: {
      normal: "Sarabun-Regular.ttf",
      bold: "Sarabun-Regular.ttf",
      italics: "Sarabun-Regular.ttf",
      bolditalics: "Sarabun-Regular.ttf",
    },
  };
}

/**
 * Generate Packing List PDF using PDFMake
 * Designed for readability and modern aesthetics.
 */
export const generatePackingListPDFMake = async (
  results: PackingPlanResult[],
  customerName: string,
  poList: string[],
  _totalItemsRequired: number = 0
) => {
  // เพิ่มระบบป้องกัน: ให้ทำงานเฉพาะบนฝั่ง Client (เบราว์เซอร์) เท่านั้น
  if (typeof window === "undefined") {
    console.error("PDF generation must run on the client side.");
    return;
  }

  void _totalItemsRequired;
  const now = new Date();
  const today = now.toLocaleDateString("en-UK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Custom format: HH:mm:ss
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeString = `${HH}:${mm}:${ss}`;

  // Filename timestamp
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const filenameTimestamp = `${yyyy}${MM}${dd}${HH}${mm}${ss}`;

  const [vfs, fonts] = await Promise.all([buildVfs(), buildFonts()]);
  const defaultFontFamily = "Sarabun";

  // --- Calculate Totals ---
  const totalPOs = results.length;
  const totalPallets = results.reduce((acc, r) => acc + r.summary.totalPallets, 0);
  const totalBoxes = results.reduce((acc, r) => acc + r.summary.totalBoxes, 0);
  const totalItems = results.reduce((acc, r) => acc + r.summary.totalItems, 0);
  const totalWarps = results.reduce(
    (acc, r) => acc + r.cases.filter((c) => c.type.includes("Warp") || c.type.includes("Wrap")).length,
    0
  );
  const totalPackages = totalPallets + totalBoxes + totalWarps;

  // Calculate Weighted Accuracy Rate
  const getCaseAccuracyScore = (c: PackingPlanResult["cases"][number]): number => {
    const type = (c.type || "").toLowerCase();
    const note = (c.note || "").toLowerCase();

    if (type.includes("unknown") || type.includes("warp") || type.includes("wrap")) return 100;
    if (type.includes("mixed")) {
      if (note.includes("primary:")) return 94;
      return 80;
    }
    return 98;
  };

  const weightedAccuracy = results.reduce(
    (acc, plan) => {
      plan.cases.forEach((c) => {
        const qty = c.items.reduce((sum, it) => sum + it.qty, 0);
        const score = getCaseAccuracyScore(c);
        acc.weightedScore += score * qty;
        acc.totalQty += qty;
      });
      return acc;
    },
    { weightedScore: 0, totalQty: 0 }
  );

  const accuracyRate = weightedAccuracy.totalQty > 0 ? weightedAccuracy.weightedScore / weightedAccuracy.totalQty : 0;
  const accuracyText = weightedAccuracy.totalQty > 0 ? `${accuracyRate.toFixed(2)}%` : "N/A";

  // --- Styles & Colors (Soft Pastel Theme) ---
  const styleHeader: Style = { fontSize: 24, bold: true, color: "#6366f1", margin: [0, 0, 0, 2], alignment: "center" };
  const styleSubHeader: Style = { fontSize: 10, color: "#94a3b8", margin: [0, 0, 0, 10], alignment: "center" };
  const styleSectionTitle: Style = { fontSize: 14, bold: true, color: "#334155", margin: [0, 10, 0, 2] };
  const styleTableHeader: Style = { bold: true, fontSize: 10, color: "#475569", fillColor: "#f1f5f9", alignment: "center" };
  const styleBadge: Style = { fontSize: 8, bold: true, color: "#ffffff", alignment: "center" };

  // --- Content Builder ---
  const content: Content[] = [];

  // Import logo (แก้ไขการเว้นวรรคด้วย %20)
  const logoUrl = "/images/Logo%20h%20no%20bg.svg";
  let logoSvg: string | undefined;
  try {
    const response = await fetch(logoUrl);
    if (response.ok) {
      logoSvg = await response.text();
    } else {
      console.warn("Logo fetch failed with status:", response.status);
    }
  } catch (e) {
    console.warn("Logo fetch failed", e);
  }

  // 1. Header Section
  const logoHeight = 45;

  content.push({
    columns: [
      logoSvg ? {
        svg: logoSvg,
        width: 150,
        height: logoHeight,
        alignment: 'left',
        margin: [-30, 0, 0, 0]
      } : { text: "", width: 150 },
      {
        stack: [
          { text: "PACKING PLAN", style: "header", alignment: "center" },
          { text: `Generated: ${today}   ${timeString}`, style: "subheader", alignment: "center" },
        ],
        width: '*'
      },
      {
        width: 150,
        stack: [
          { text: "CUSTOMER", style: { fontSize: 9, bold: true, color: "#cbd5e1" } },
          { text: customerName.toUpperCase(), style: { fontSize: 14, bold: true, color: "#1e293b" } },
        ],
        alignment: "right",
      },
    ],
    margin: [0, 0, 0, 10],
    columnGap: 10
  });

  // 2. Summary Cards (Single Row)
  content.push({
    columns: [
      createSummaryCard("TOTAL PO", totalPOs.toString(), "#f1f5f9", "#475569"),
      createSummaryCard("TOTAL ITEMS", totalItems.toString(), "#f1f5f9", "#475569"),
      createSummaryCard("TOTAL PACKAGES", totalPackages.toString(), "#f1f5f9", "#475569"),
      createSummaryCard("TOTAL PALLETS", totalPallets.toString(), "#ecfdf5", "#059669"),
      createSummaryCard("TOTAL BOXES", totalBoxes.toString(), "#eff6ff", "#2563eb"),
      createSummaryCard("TOTAL WRAP", totalWarps.toString(), "#faf5ff", "#9333ea"),
    ],
    columnGap: 5,
    margin: [0, 0, 0, 10],
  });

  // PO List Summary
  content.push({
    text: `Orders Included: ${poList.join(', ')}`,
    style: { fontSize: 8, color: "#94a3b8", italics: true },
    margin: [0, 0, 0, 2]
  });

  // 3. PO Details Header with Accuracy Rate
  content.push({
    columns: [
      { text: "Detailed Packing List", style: "sectionTitle", width: "*" },
      {
        text: `Accuracy Rate: ${accuracyText}`,
        style: { fontSize: 10, bold: true, color: accuracyRate === 100 ? "#059669" : "#d97706" },
        alignment: "right",
        margin: [0, 15, 0, 0]
      }
    ],
    columnGap: 10,
    margin: [0, 5, 0, 5]
  });

  results.forEach((plan, index) => {
    const poTotalQty = plan.cases.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0), 0);

    if (index > 0) content.push({ text: "", margin: [0, 5, 0, 0] });

    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: [
                { text: `PO: ${plan.po}`, style: { fontSize: 12, bold: true, color: "#475569" } },
                { text: `   Qty: ${poTotalQty}`, style: { fontSize: 12, bold: true, color: "#64748b" } }
              ],
              fillColor: "#f8fafc",
              border: [false, false, false, false],
              margin: [5, 4, 5, 4]
            }
          ]
        ]
      },
      layout: 'noBorders',
      margin: [0, 5, 0, 0]
    });

    const tableBody: TableCell[][] = [
      [
        { text: "#", style: "tableHeader", border: [false, false, false, false] },
        { text: "Type", style: "tableHeader", border: [false, false, false, false] },
        { text: "Item", style: "tableHeader", border: [false, false, false, false] },
        { text: "Qty", style: "tableHeader", border: [false, false, false, false] },
        { text: "Dimensions", style: "tableHeader", border: [false, false, false, false] },
        { text: "Note", style: "tableHeader", border: [false, false, false, false] },
      ],
    ];

    plan.cases.forEach((c, i) => {
      const isEven = i % 2 === 0;
      const rowColor = isEven ? "#ffffff" : "#fbfcfd";

      tableBody.push([
        { text: c.caseNo.toString(), alignment: "center", fillColor: rowColor, border: [false, false, false, true], borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"], color: "#64748b" },
        {
          text: c.type,
          color: "#475569",
          alignment: "center",
          bold: false,
          fillColor: rowColor,
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
          fontSize: 8
        },
        {
          text: c.items.map((it) => it.sku).join("\n"),
          alignment: "left",
          fillColor: rowColor,
          fontSize: 9,
          color: "#334155",
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
        },
        {
          text: c.items.map((it) => it.qty.toString()).join("\n"),
          alignment: "center",
          fillColor: rowColor,
          fontSize: 9,
          color: "#334155",
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
        },
        {
          text: c.dims || "-",
          alignment: "center",
          fillColor: rowColor,
          fontSize: 9,
          color: "#64748b",
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
          font: "Roboto"
        },
        {
          text: c.note || "-",
          alignment: "left",
          italics: true,
          fillColor: rowColor,
          fontSize: 8,
          color: "#94a3b8",
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
        },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [20, 70, 110, 30, 90, "*"],
        body: tableBody,
      },
      layout: {
        hLineWidth: (i: number, node: { table: { body: unknown[][] } }) => {
          return (i === 1 || i === node.table.body.length) ? 1 : 0;
        },
        vLineWidth: () => 0,
        hLineColor: () => "#e2e8f0",
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      } as unknown as string,
      margin: [0, 0, 0, 15],
    });
  });

  // --- Document Definition ---
  const docDefinition: TDocumentDefinitions = {
    content: content,
    pageSize: "A4",
    pageMargins: [30, 20, 30, 20],
    styles: {
      header: styleHeader,
      subheader: styleSubHeader,
      sectionTitle: styleSectionTitle,
      tableHeader: styleTableHeader,
      badge: styleBadge,
    },
    defaultStyle: {
      font: defaultFontFamily,
      fontSize: 9,
      color: "#475569",
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        text: `${currentPage} / ${pageCount}`,
        alignment: "center",
        fontSize: 8,
        color: "#cbd5e1",
        margin: [0, 10, 0, 0],
      };
    },
  };

  try {
    const pdfMakeAny = pdfMake as any;
    // ปรับปรุงการเรียกใช้งานสร้าง PDF ให้เสถียรที่สุด
    pdfMakeAny
      .createPdf(docDefinition, undefined, fonts, vfs)
      .download(`PackingPlan_${customerName}_${totalItems}_${filenameTimestamp}.pdf`);
  } catch (error) {
    console.error("Error generating PDF Make:", error);
    alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาตรวจสอบ Console Log ครับ");
  }
};

// --- Helper Components ---

function createSummaryCard(title: string, value: string, bgColor: string, accentColor: string): Content {
  return {
    table: {
      widths: ['*'],
      body: [[
        {
          stack: [
            { text: title, fontSize: 7, bold: true, color: "#94a3b8", margin: [0, 0, 0, 2] },
            { text: value, fontSize: 16, bold: true, color: accentColor },
          ],
          border: [false, false, false, true],
          borderColor: ["#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"],
          alignment: 'center',
          margin: [0, 2, 0, 2]
        }
      ]]
    },
    layout: 'noBorders'
  };
}