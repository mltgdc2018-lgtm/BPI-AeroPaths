"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PackingPlanResult } from "@/lib/services/packing-logic/packing.types";
import { TDocumentDefinitions, Content } from "pdfmake/interfaces";

// ==========================
// ✅ TYPE SAFE (แทน any)
// ==========================
type PdfMakeWithExt = typeof pdfMake & {
  vfs?: Record<string, string>;
  fonts?: Record<string, unknown>;
  addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  addFonts?: (fonts: Record<string, unknown>) => void;
};

type PdfFontsType = {
  pdfMake?: {
    vfs?: Record<string, string>;
  };
};

// ==========================
// 🔧 FONT LOADER
// ==========================
async function fetchFont(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Font load failed");

  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));

  return btoa(binary);
}

async function buildVfs(): Promise<Record<string, string>> {
  try {
    const sarabun = await fetchFont(
      `${window.location.origin}/fonts/Sarabun-Regular.ttf`
    );

    const baseVfs =
      (pdfFonts as PdfFontsType)?.pdfMake?.vfs ||
      (pdfFonts as unknown as Record<string, string>);

    return {
      ...baseVfs,
      "Sarabun-Regular.ttf": sarabun,
    };
  } catch (e) {
    console.error("Font error:", e);
    return (
      (pdfFonts as PdfFontsType)?.pdfMake?.vfs ||
      {}
    );
  }
}

function buildFonts(): Record<string, unknown> {
  return {
    Sarabun: {
      normal: "Sarabun-Regular.ttf",
      bold: "Sarabun-Regular.ttf",
      italics: "Sarabun-Regular.ttf",
      bolditalics: "Sarabun-Regular.ttf",
    },
  };
}

// ==========================
// 🚀 MAIN FUNCTION
// ==========================
export const generatePackingListPDFMake = async (
  results: PackingPlanResult[],
  customerName: string,
  poList: string[],
  totalItemsRequired: number
) => {
  try {
    const filename = `PackingPlan_${customerName}_${Date.now()}.pdf`;

    const vfs = await buildVfs();
    const fonts = buildFonts();

    const pdfMakeExt = pdfMake as PdfMakeWithExt;

    if (pdfMakeExt.addVirtualFileSystem && pdfMakeExt.addFonts) {
      pdfMakeExt.addVirtualFileSystem(vfs);
      pdfMakeExt.addFonts(fonts);
    } else {
      pdfMakeExt.vfs = vfs;
      pdfMakeExt.fonts = fonts;
    }

    // ==========================
    // LOGO
    // ==========================
    let logoSvg: string | undefined;

    try {
      const res = await fetch("/images/logo.svg");
      if (res.ok) logoSvg = await res.text();
    } catch {
      console.warn("Logo load fail");
    }

    // ==========================
    // CONTENT
    // ==========================
    const content: Content[] = [];

    content.push({
      columns: [
        logoSvg ? { svg: logoSvg, width: 120 } : { text: "" },
        { text: "PACKING PLAN", alignment: "center", bold: true },
        { text: customerName, alignment: "right", bold: true },
      ],
    });

    content.push({
      text: `PO: ${poList.join(", ")}`,
      margin: [0, 10, 0, 5],
    });

    content.push({
      text: `Total Required: ${totalItemsRequired}`,
      margin: [0, 0, 0, 10],
    });

    results.forEach((plan) => {
      content.push({
        text: `PO: ${plan.po}`,
        bold: true,
        margin: [0, 10, 0, 5],
      });

      const tableBody: (string | number)[][] = [
        ["#", "Item", "Qty"],
      ];

      plan.cases.forEach((c) => {
        c.items.forEach((it) => {
          tableBody.push([
            c.caseNo,
            it.sku,
            it.qty,
          ]);
        });
      });

      content.push({
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto"],
          body: tableBody,
        },
      });
    });

    const docDefinition: TDocumentDefinitions = {
      content,
      defaultStyle: {
        font: "Sarabun",
      },
    };

    pdfMake.createPdf(docDefinition).download(filename);

  } catch (error) {
    console.error("PDF GENERATE ERROR:", error);
    alert("Download PDF ไม่สำเร็จ");
  }
};