import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { TDocumentDefinitions, Content, Style } from "pdfmake/interfaces";

interface PackingRule {
  layers: number | 'n' | 'w'; 
  perLayer: number | string;
  totalQty: number | string;
}

interface PackagingProduct {
  sku: string;
  name: string;
  width: number;
  length: number;
  height: number;
  nw: number; 
  gw: number; 
  cbm: number;
  productType: 'Carton' | 'Carton Case' | 'Wooden Case' | string;
  stackingLimit: number;
  sideBoxWeight: string;
  lastUpdated: string;
  
  packingRules: {
    boxes: Record<string, PackingRule>; 
    pallets: Record<string, PackingRule>; 
    rtn: PackingRule;
    warp: boolean;
  };
}

async function fetchFont(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
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

export const generatePackagingSpecPDFMake = async (product: PackagingProduct) => {
  const sarabunData = await fetchFont("/fonts/Sarabun-Regular.ttf");
  const vfs = {
    ...getDefaultVfs(),
    "Sarabun-Regular.ttf": sarabunData,
  };

  const fonts = {
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

  const styleHeader: Style = { fontSize: 20, bold: true, color: "#4338ca", margin: [0, 0, 0, 10] };
  const styleSectionTitle: Style = { fontSize: 13, bold: true, color: "#334155", margin: [0, 8, 0, 4] };
  const styleLabel: Style = { bold: true, fontSize: 9, color: "#64748b", fillColor: "#f8fafc" };
  const styleValue: Style = { fontSize: 10, color: "#1e293b" };

  const content: Content[] = [];

  // Header
  content.push({
    table: {
      widths: ["*"],
      body: [[{ text: "Packaging Specification", style: styleHeader, border: [false, false, false, false], fillColor: "#eef2ff" }]]
    },
    layout: "noBorders",
    margin: [0, 0, 0, 15]
  });

  content.push({ text: `Generated on: ${new Date().toLocaleDateString()}`, fontSize: 9, color: "#94a3b8", margin: [0, -10, 0, 15], alignment: "right" });

  // Product Details
  content.push({ text: "Product Details", style: styleSectionTitle });
  content.push({
    table: {
      widths: [80, "*", 80, "*"],
      body: [
        [{ text: "SKU", style: styleLabel }, { text: product.sku, style: styleValue }, { text: "Product Name", style: styleLabel }, { text: product.name, style: styleValue }],
        [{ text: "Type", style: styleLabel }, { text: product.productType, style: styleValue }, { text: "Last Updated", style: styleLabel }, { text: product.lastUpdated, style: styleValue }],
        [{ text: "Dimensions (cm)", style: styleLabel }, { text: `${product.width} x ${product.length} x ${product.height}`, style: styleValue }, { text: "CBM", style: styleLabel }, { text: product.cbm.toString(), style: styleValue }],
        [{ text: "Net Weight (kg)", style: styleLabel }, { text: product.nw.toString(), style: styleValue }, { text: "Gross Weight (kg)", style: styleLabel }, { text: product.gw.toString(), style: styleValue }],
        [{ text: "Stacking Limit", style: styleLabel }, { text: `${product.stackingLimit} Layers`, style: styleValue }, { text: "Side Box Weight", style: styleLabel }, { text: product.sideBoxWeight || "N/A", style: styleValue }],
      ]
    },
    layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#e2e8f0",
        vLineColor: () => "#e2e8f0",
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4,
    }
  });

  // Standard Boxes
  content.push({ text: "Standard Boxes (Packing Rules)", style: styleSectionTitle });
  const sortedBoxes = Object.entries(product.packingRules.boxes).sort((a, b) => {
    const getVol = (s: string) => {
      const d = s.split('x').map(Number);
      return d.length === 3 ? d[0] * d[1] * d[2] : 0;
    };
    return getVol(a[0]) - getVol(b[0]);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxBody: any[][] = [
    [
      { text: "Box Size", style: { ...styleLabel, alignment: "center", fillColor: "#c7d2fe", color: "#312e81" } }, 
      { text: "Layers", style: { ...styleLabel, alignment: "center", fillColor: "#c7d2fe", color: "#312e81" } }, 
      { text: "Qty / Layer", style: { ...styleLabel, alignment: "center", fillColor: "#c7d2fe", color: "#312e81" } }, 
      { text: "Total Qty", style: { ...styleLabel, alignment: "center", fillColor: "#c7d2fe", color: "#312e81" } }
    ],
    ...sortedBoxes.map(([size, rule]) => [
      { text: size, style: { ...styleValue, bold: true }, alignment: "left" as const },
      { text: rule.layers.toString(), style: styleValue, alignment: "center" as const },
      { text: rule.perLayer.toString(), style: styleValue, alignment: "center" as const },
      { text: rule.totalQty.toString(), style: styleValue, alignment: "center" as const }
    ])
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ["*", "*", "*", "*"],
      body: boxBody
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10]
  });

  // Pallet Configuration
  content.push({ text: "Pallet Configuration", style: styleSectionTitle });
  const palletOrder = ["80x120x65", "80x120x90", "80x120x115", "110x110x65", "110x110x90", "110x110x115"];
  const sortedPallets = Object.entries(product.packingRules.pallets).sort((a, b) => {
    const idxA = palletOrder.indexOf(a[0]);
    const idxB = palletOrder.indexOf(b[0]);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palletBody: any[][] = [
    [
      { text: "Pallet Type", style: { ...styleLabel, alignment: "center", fillColor: "#a7f3d0", color: "#064e3b" } }, 
      { text: "Layers", style: { ...styleLabel, alignment: "center", fillColor: "#a7f3d0", color: "#064e3b" } }, 
      { text: "Qty / Layer", style: { ...styleLabel, alignment: "center", fillColor: "#a7f3d0", color: "#064e3b" } }, 
      { text: "Total Qty", style: { ...styleLabel, alignment: "center", fillColor: "#a7f3d0", color: "#064e3b" } }
    ],
    ...sortedPallets.map(([type, rule]) => [
      { text: type, style: { ...styleValue, bold: true }, alignment: "left" as const },
      { text: rule.layers.toString(), style: styleValue, alignment: "center" as const },
      { text: rule.perLayer.toString(), style: styleValue, alignment: "center" as const },
      { text: rule.totalQty.toString(), style: styleValue, alignment: "center" as const }
    ])
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ["*", "*", "*", "*"],
      body: palletBody
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10]
  });

  // Special Packaging
  content.push({ text: "Special Packaging", style: styleSectionTitle });
  const rtn = product.packingRules.rtn;
  const warp = product.packingRules.warp;

  content.push({
    columns: [
      {
        stack: [
          { text: "RTN (Returnable)", fontSize: 10, bold: true, color: "#64748b", margin: [0, 0, 0, 4] },
          (rtn && Number(rtn.totalQty) > 0) 
            ? { text: `${rtn.layers} Layers x ${rtn.perLayer} / Layer\n${rtn.totalQty} PCS`, fontSize: 11, color: "#4338ca", bold: true }
            : { text: "Not Configured", fontSize: 10, color: "#94a3b8" }
        ],
        width: "50%"
      },
      {
        stack: [
          { text: "Wrap Packaging", fontSize: 10, bold: true, color: "#64748b", margin: [0, 0, 0, 4] },
          { 
            text: warp ? "REQUIRED" : "NOT REQUIRED", 
            fontSize: 12, 
            bold: true, 
            color: warp ? "#059669" : "#ea580c" 
          }
        ],
        width: "50%"
      }
    ],
    columnGap: 20,
    margin: [0, 5, 0, 20]
  });

  const docDefinition: TDocumentDefinitions = {
    content,
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: "Sarabun",
      fontSize: 10
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMakeRuntime = pdfMake as any;
  pdfMakeRuntime.addVirtualFileSystem?.(vfs);
  pdfMakeRuntime.addFonts?.(fonts);
  pdfMakeRuntime.createPdf(docDefinition).download(`${product.sku}_PackingSpec.pdf`);
};
