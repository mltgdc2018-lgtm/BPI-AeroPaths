"use client";

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { PackingPlanResult } from "@/lib/services/packing-logic/packing.types";
import { TDocumentDefinitions, Content, Style } from "pdfmake/interfaces";

// ==========================
// 🔧 FIX 1: Safe Font Loader
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

async function buildVfs() {
  try {
    const sarabun = await fetchFont(
      `${window.location.origin}/fonts/Sarabun-Regular.ttf`
    );

    const baseVfs =
      (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any);

    return {
      ...baseVfs,
      "Sarabun-Regular.ttf": sarabun,
    };
  } catch (e) {
    console.error("Font error:", e);
    return (pdfFonts as any)?.pdfMake?.vfs || {};
  }
}

function buildFonts() {
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
  poList: string[]
) => {
  try {
    const now = new Date();

    const filename = `PackingPlan_${customerName}_${Date.now()}.pdf`;

    // ==========================
    // 🔧 FIX 2: Load VFS + Fonts
    // ==========================
    const vfs = await buildVfs();
    const fonts = buildFonts();

    if ((pdfMake as any).addVirtualFileSystem) {
      (pdfMake as any).addVirtualFileSystem(vfs);
      (pdfMake as any).addFonts(fonts);
    } else {
      (pdfMake as any).vfs = vfs;
      (pdfMake as any).fonts = fonts;
    }

    // ==========================
    // 🔧 FIX 3: Safe Logo
    // ==========================
    let logoSvg: string | undefined;

    try {
      const res = await fetch("/images/logo.svg"); // ⚠️ เปลี่ยนชื่อไฟล์แล้ว
      if (res.ok) logoSvg = await res.text();
    } catch (e) {
      console.warn("Logo load fail");
    }

    // ==========================
    // 📊 SIMPLE CONTENT (Stable)
    // ==========================
    const content: Content[] = [];

    content.push({
      columns: [
        logoSvg
          ? { svg: logoSvg, width: 120 }
          : { text: "" },

        {
          text: "PACKING PLAN",
          style: "header",
          alignment: "center",
        },

        {
          text: customerName,
          alignment: "right",
          bold: true,
        },
      ],
    });

    content.push({
      text: `PO: ${poList.join(", ")}`,
      margin: [0, 10, 0, 10],
    });

    // ==========================
    // 📦 TABLE
    // ==========================
    results.forEach((plan) => {
      content.push({
        text: `PO: ${plan.po}`,
        style: "section",
      });

      const tableBody = [
        ["#", "Item", "Qty"],
      ];

      plan.cases.forEach((c) => {
        c.items.forEach((it) => {
          tableBody.push([
            c.caseNo.toString(),
            it.sku,
            it.qty.toString(),
          ]);
        });
      });

      content.push({
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto"],
          body: tableBody,
        },
        margin: [0, 5, 0, 15],
      });
    });

    // ==========================
    // 📄 DOC
    // ==========================
    const docDefinition: TDocumentDefinitions = {
      content,
      defaultStyle: {
        font: "Sarabun",
      },
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        section: {
          fontSize: 12,
          bold: true,
          margin: [0, 10, 0, 5],
        },
      },
    };

    // ==========================
    // 🔥 FIX 4: FORCE DOWNLOAD
    // ==========================
    pdfMake.createPdf(docDefinition).download(filename);

  } catch (error) {
    console.error("PDF GENERATE ERROR:", error);
    alert("Download PDF ไม่สำเร็จ");
  }
};