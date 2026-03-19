import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PackingPlanResult } from '@/lib/services/packingLogic';

// Re-defining types to match page.tsx for independence/portability
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

export const generatePackagingSpecPDF = (product: PackagingProduct) => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFillColor(199, 210, 254); // Soft Indigo 200
  doc.rect(0, 0, 210, 30, 'F'); // Reduced height

  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFontSize(18); // Reduced size
  doc.setFont('helvetica', 'bold');
  doc.text("Packaging Specification", 14, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

  // --- Product Information ---
  let yPos = 40; // Reduced starting Y
  
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Product Details", 14, yPos);
  
  yPos += 7; // Reduced gap
  
  const productInfo = [
    ["SKU", product.sku, "Product Name", product.name],
    ["Type", product.productType, "Last Updated", product.lastUpdated],
    ["Dimensions (cm)", `${product.width} x ${product.length} x ${product.height}`, "CBM", product.cbm.toString()],
    ["Net Weight (kg)", product.nw.toString(), "Gross Weight (kg)", product.gw.toString()],
    ["Stacking Limit", `${product.stackingLimit} Layers`, "Side Box Weight", product.sideBoxWeight || "N/A"]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: productInfo,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] }, // Smaller font/padding
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 }, 
      1: { cellWidth: 60 }, 
      2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 }, 
      3: { cellWidth: 60 }, 
    },
  });

  // @ts-expect-error: jspdf-autotable adds finalY
  yPos = doc.lastAutoTable.finalY + 10; // Tighten gap

  // --- Packing Standards: Boxes ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("Standard Boxes (Packing Rules)", 14, yPos);
  
  yPos += 5;

  const boxRows = Object.entries(product.packingRules.boxes)
    // Sort by volume small to big (re-implementing sort logic for consistency)
    .sort((a, b) => {
       const getVol = (s: string) => {
         const d = s.split('x').map(Number);
         return d.length === 3 ? d[0]*d[1]*d[2] : 0;
       };
       return getVol(a[0]) - getVol(b[0]);
    })
    .map(([size, rule]) => [
      size,
      rule.layers,
      rule.perLayer,
      rule.totalQty
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Box Size', 'Layers', 'Qty / Layer', 'Total Qty']],
    body: boxRows,
    theme: 'striped',
    headStyles: { fillColor: [165, 180, 252], textColor: 50, fontStyle: 'bold' }, // Soft Indigo
    styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
  });

  // @ts-expect-error: jspdf-autotable adds finalY
  yPos = doc.lastAutoTable.finalY + 10;

  // --- Packing Standards: Pallets ---
  // Removed page break check to force single page

  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text("Pallet Configuration", 14, yPos);
  
  yPos += 5;

  const palletOrder = [
    "80x120x65", "80x120x90", "80x120x115",
    "110x110x65", "110x110x90", "110x110x115"
  ];

  const palletRows = Object.entries(product.packingRules.pallets)
    .sort((a, b) => {
       const indexA = palletOrder.indexOf(a[0]);
       const indexB = palletOrder.indexOf(b[0]);
       
       // If both in list, sort by index
       if (indexA !== -1 && indexB !== -1) return indexA - indexB;
       // If one in list, it comes first
       if (indexA !== -1) return -1;
       if (indexB !== -1) return 1;
       // Otherwise sort alphabetically
       return a[0].localeCompare(b[0]);
    })
    .map(([type, rule]) => [
      type, // Key is already clean (e.g. 80x120x65)
      rule.layers,
      rule.perLayer,
      rule.totalQty
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Pallet Type', 'Layers', 'Qty / Layer', 'Total Qty']],
    body: palletRows,
    theme: 'striped',
    headStyles: { fillColor: [167, 243, 208], textColor: 50, fontStyle: 'bold' }, // Soft Emerald
    styles: { fontSize: 9, halign: 'center', cellPadding: 2 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
  });
  
  // @ts-expect-error: jspdf-autotable adds finalY
  yPos = doc.lastAutoTable.finalY + 10;

  // --- Special Packaging (RTN & Wrap) ---
  // Removed page break check

  doc.setFontSize(12);
  doc.text("Special Packaging", 14, yPos);
  yPos += 8;

  // RTN Card Style - Smaller & Softer (No Border)
  // doc.setDrawColor(226, 232, 240); // Slate 200
  // doc.setFillColor(255, 255, 255);
  // doc.roundedRect(14, yPos, 85, 20, 2, 2, 'FD'); // Removed border

  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text("RTN (Returnable)", 18, yPos + 6);
  
  const rtn = product.packingRules.rtn;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  if (rtn && Number(rtn.totalQty) > 0) {
      doc.text(`${rtn.layers} Layers x ${rtn.perLayer} / Layer`, 18, yPos + 12);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241); // Soft Indigo
      doc.text(`${rtn.totalQty} PCS`, 18, yPos + 17);
  } else {
      doc.text("Not Configured", 18, yPos + 12);
  }

  // Wrap Card Style - No Background, Minimal
  // doc.roundedRect(105, yPos, 85, 30, 3, 3, 'FD'); // Removed background
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text("Wrap Packaging", 111, yPos + 6);
  
  const warp = product.packingRules.warp;
  doc.setFontSize(11); // Slightly smaller
  if (warp) {
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text("REQUIRED", 111, yPos + 14);
  } else {
      doc.setTextColor(249, 115, 22); // Orange
      doc.text("NOT REQUIRED", 111, yPos + 14);
  }

  // Save
  doc.save(`${product.sku}_PackingSpec.pdf`);
};

export const generatePackingListPDF = (
  results: PackingPlanResult[], 
  customerName: string,
  poList: string[]
) => {
  const doc = new jsPDF();
  const now = new Date();
  const today = now.toLocaleDateString();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');

  // --- Header ---
  // Using very light Indigo 50 for better eyes comfort
  doc.setFillColor(238, 242, 255); 
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(67, 56, 202); // Dark Indigo text on light bg
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("Packing List Plan", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Generated: ${today}`, 160, 20);

  let yPos = 40;

  // --- Summary Section ---
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(12); // Reduced from 14
  doc.setFont('helvetica', 'bold');
  doc.text("Plan Summary", 14, yPos);
  
  yPos += 6;

  const totalPallets = results.reduce((acc, r) => acc + r.summary.totalPallets, 0);
  const totalBoxes = results.reduce((acc, r) => acc + r.summary.totalBoxes, 0);
  const totalItems = results.reduce((acc, r) => acc + r.summary.totalItems, 0);

  const summaryData = [
    ["Customer", customerName, "Total POs", results.length.toString()],
    ["Total Pallets", totalPallets.toString(), "Total Boxes", totalBoxes.toString()],
    ["Total Items", totalItems.toString(), "PO List", poList.join(", ")]
  ];

  autoTable(doc, {
    startY: yPos,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 60 },
    },
  });

  // @ts-expect-error: jspdf-autotable adds finalY
  yPos = doc.lastAutoTable.finalY + 12;

  // --- Details per PO ---
  
  results.forEach((plan) => {
    // Check page break
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10); // Reduced from 12
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // Slate 700
    doc.setFillColor(248, 250, 252); // Slate 50 (Much lighter)
    doc.rect(14, yPos - 5, 182, 8, 'F'); // Reduced height
    doc.text(`PO: ${plan.po}`, 18, yPos);
    
    yPos += 5;

    // Prepare table body
    const rows = plan.cases.map(c => [
      c.caseNo,
      c.type,
      c.items.map(i => `${i.sku} (x${i.qty})`).join("\n"),
      c.dims || "-",
      c.note || "-"
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Case #', 'Type', 'Contents', 'Dimensions', 'Note']],
      body: rows,
      theme: 'grid',
      headStyles: { 
        fillColor: [241, 245, 249], 
        textColor: 70, 
        fontStyle: 'bold',
        fontSize: 8 // Reduced header size
      }, 
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' }, // Reduced from 9
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Shrunk
        1: { cellWidth: 30 },
        2: { cellWidth: 45 }, // Reduced from 60 to give more space to Note
        3: { cellWidth: 30 },
        4: { cellWidth: 'auto' } // Note gets the rest
      },

      didParseCell: (data) => {
        // Color coding for types
        if (data.section === 'body' && data.column.index === 1) {
            const typeText = data.cell.text.join(' ');
            if (typeText.includes('Full Pallet')) data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
            else if (typeText.includes('Mixed Pallet')) data.cell.styles.textColor = [234, 88, 12]; // Orange 600
            else if (typeText.includes('Full Box')) data.cell.styles.textColor = [2, 132, 199]; // Sky 600
            else if (typeText.includes('Mixed Box')) data.cell.styles.textColor = [202, 138, 4]; // Yellow 600
            else if (typeText.includes('Warp') || typeText.includes('Wrap')) data.cell.styles.textColor = [147, 51, 234]; // Purple 600
        }
      }
    });

    // @ts-expect-error: jspdf-autotable adds finalY
    yPos = doc.lastAutoTable.finalY + 12;
  });

  doc.save(`PackingPlan_${customerName}_${timestamp}.pdf`);
};
