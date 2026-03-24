// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfMake from "pdfmake/build/pdfmake";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PackingPlanResult } from "../services/packing-logic/packing.types";
import { TDocumentDefinitions, Content, Style, TableCell } from "pdfmake/interfaces";
import { sarabunFonts } from "./sarabunFonts";

type PdfFontFamily = {
  normal: string;
  bold: string;
  italics: string;
  bolditalics: string;
};

type PdfMakeRuntime = {
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  addFonts?: (fonts: Record<string, PdfFontFamily>) => void;
  createPdf?: (
    docDefinition: TDocumentDefinitions,
    tableLayouts?: unknown,
    fonts?: Record<string, PdfFontFamily>,
    vfs?: Record<string, string>
  ) => { download: (fileName?: string) => void };
};

function getDefaultVfs(): Record<string, string> {
  const withPdfMake = pdfFonts as { pdfMake?: { vfs?: Record<string, string> } };
  return withPdfMake.pdfMake?.vfs ?? (pdfFonts as unknown as Record<string, string>);
}

function buildVfs(): Record<string, string> {
  return {
    ...getDefaultVfs(),
    ...sarabunFonts,
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

  const vfs = buildVfs();
  const fonts = buildFonts();
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
  const totalPackages = totalPallets + totalBoxes + totalWarps; // Sum of all containers

  // Calculate Weighted Accuracy Rate (by packed qty)
  const getCaseAccuracyScore = (c: PackingPlanResult["cases"][number]): number => {
    const type = (c.type || "").toLowerCase();
    const note = (c.note || "").toLowerCase();

    if (type.includes("unknown") || type.includes("warp") || type.includes("wrap")) return 100;
    if (type.includes("mixed")) {
      // High-density mixed path uses Primary/Insert note pattern.
      if (note.includes("primary:")) return 94;
      return 80; // Mixed pool / low-density
    }
    // Mono / Overflow / Same
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
  const styleHeader: Style = { fontSize: 24, bold: true, color: "#6366f1", margin: [0, 0, 0, 2], alignment: "center" }; // Indigo 500
  const styleSubHeader: Style = { fontSize: 10, color: "#94a3b8", margin: [0, 0, 0, 10], alignment: "center" };
  const styleSectionTitle: Style = { fontSize: 14, bold: true, color: "#334155", margin: [0, 10, 0, 2] };
  const styleTableHeader: Style = { bold: true, fontSize: 10, color: "#475569", fillColor: "#f1f5f9", alignment: "center" };
  const styleBadge: Style = { fontSize: 8, bold: true, color: "#ffffff", alignment: "center" };

  // --- Content Builder ---
  const content: Content[] = [];

  // Import logo
  const logoUrl = "/images/Logo h no bg.svg";
  let logoSvg: string | undefined;
  try {
    const response = await fetch(logoUrl);
    if (response.ok) {
      logoSvg = await response.text();
    }
  } catch (e) {
    console.warn("Logo fetch failed", e);
  }

  // 1. Header Section
  const logoHeight = 45; // Original height

  content.push({
    columns: [
      logoSvg ? {
        svg: logoSvg,
        width: 150,
        height: logoHeight,
        alignment: 'left',
        margin: [-30, 0, 0, 0] // Moved further left per request
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
          { text: "CUSTOMER", style: { fontSize: 9, bold: true, color: "#cbd5e1" } }, // Slate 300
          { text: customerName.toUpperCase(), style: { fontSize: 14, bold: true, color: "#1e293b" } }, // Slate 800
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
    // Calculate Total Qty for this PO
    const poTotalQty = plan.cases.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0), 0);

    // Spacer between POs
    if (index > 0) content.push({ text: "", margin: [0, 5, 0, 0] });

    // Unified Header Table (PO + Qty)
    // This part is the "Top half" of the block.
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
      margin: [0, 5, 0, 0] // Fixed to the top of the next table
    });

    // Data Table 
    // This part is the "Bottom half" of the block. Only the headings row repeats.
    const tableBody: TableCell[][] = [
      [            // Row 0: Column Headers (This row repeats on page breaks)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeRaw = pdfMake as any;
  const pdfMakeRuntime = (pdfMakeRaw?.createPdf ? pdfMakeRaw : (pdfMakeRaw?.default || pdfMakeRaw)) as PdfMakeRuntime;

  pdfMakeRuntime.addVirtualFileSystem?.(vfs);
  pdfMakeRuntime.addFonts?.(fonts);
  
  if (typeof pdfMakeRuntime.createPdf === "function") {
    pdfMakeRuntime.createPdf(docDefinition).download(`PackingPlan_${customerName}_${totalItems}_${filenameTimestamp}.pdf`);
  } else {
    console.error("pdfMake.createPdf is not a function", pdfMakeRuntime);
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