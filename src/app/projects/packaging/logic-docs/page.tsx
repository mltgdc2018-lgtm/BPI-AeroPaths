"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { 
  Printer, 
  ArrowLeft, 
  Database, 
  Layers, 
  CheckCircle2, 
  Zap,
  FileText,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { GlassCard } from "@/components/shared/GlassCard";
import mermaid from "mermaid";

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  },
  themeVariables: {
    primaryColor: '#EFD09E',
    primaryBorderColor: '#7E5C4A',
    primaryTextColor: '#272727',
    lineColor: '#7E5C4A',
    tertiaryColor: '#F6EDDE'
  }
});

const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.render(`mermaid-${Math.random().toString(36).substring(2, 11)}`, chart).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      });
    }
  }, [chart]);

  return <div ref={ref} className="w-full flex justify-center bg-[#EFD09E]/55 p-6 rounded-xl border border-[#D4AA7D]/35 select-none" />;
};

interface StepItem {
  step: string;
  title: string;
  desc: string;
  detail: string[];
  objectives: string[];
  context: string;
  chart: string;
}

const StepsData: StepItem[] = [
  {
    step: "1-2",
    title: "Data Acquisition & Classification",
    desc: "ดึงข้อมูลจาก Source และคัดแยกประเภทสินค้า (Mono/Alone/Same/Mixed)",
    detail: [
      "1. Input Parsing: รับค่า String (PO, SKU, Qty) และ Clean ข้อมูลตัด Comma/Space ออก",
      "2. Aggregation: รวมสินค้าที่มี PO+SKU เดียวกันเข้าด้วยกันเพื่อลดรายการซ้ำซ้อน",
      "3. Sorting: เรียงลำดับข้อมูลตาม PO (A-Z) และ Qty (มาก-น้อย) เพื่อเตรียมจัดกลุ่ม"
    ],
    objectives: [
      "เปลี่ยน Raw Text ให้เป็น Structured JSON ที่พร้อมคำนวณ",
      "กรองข้อมูลขยะ (Invalid Data) ออกจากระบบตั้งแต่ต้นทาง"
    ],
    context: "Data Integrity เป็นหัวใจสำคัญ ข้อมูลที่ผ่านขั้นตอนนี้ต้องถูกต้อง 100% เพื่อป้องกัน Error ในการคำนวณ Dimension ภายหลัง",
    chart: `
    flowchart TD
      A[📥 Raw Input String] --> B{Parse Success?}
      B -- No --> X[❌ Error Log]
      B -- Yes --> C[🧹 Clean Data]
      C --> D[🔄 Aggregate Duplicates]
      D --> E[🗂️ Sort by PO & Qty]
      E --> F[✅ WorkingItems List]
      
      C -.-> C1(Trim Spaces)
      C -.-> C2(Remove Commas)
      D -.-> D1(Sum Qty by SKU)
    `
  },
  {
    step: "3-5",
    title: "Spec Fetching & Wrap Classification",
    desc: "ดึงข้อมูลขนาดสินค้าและคัดแยกสินค้า Wrap (Over-dimension)",
    detail: [
      "1. Get Allowed Packages: ดึงรายการกล่องที่อนุญาตสำหรับ Region (A/E/R) ของ PO นั้นๆ",
      "2. Fetch Specs: ดึงขนาด (WxLxH) จาก SKU Master Data",
      "3. Wrap Rule Check: ตรวจสอบ flag 'warp' ใน database หากเป็น true -> จัดเป็น Wrap Case",
      "4. Dimension Check: หากไม่มี flag แต่มีขนาด M3 >= 0.15 -> ปัดเป็น Wrap Case โดยอัตโนมัติ",
      "5. Unknown Handling: หาก M3 < 0.15 และไม่มี Spec -> จัดเป็น Unknown Case และจบกระบวนการ",
      "6. Split PO: กระจายสินค้าเข้า Bucket และคำนวณ Unique Dimensions เพื่อแยก Mono/Mixed PO"
    ],
    objectives: [
      "แยกสินค้าที่ 'ใส่กล่องปกติไม่ได้' ออกไปจัดการต่างหาก (Wrap Handling)",
      "ตรวจสอบว่าสินค้ามี Master Data ครบถ้วนหรือไม่ (Unknown handling)"
    ],
    context: "การคัดแยก Wrap ออกก่อน ช่วยลดความซับซ้อนของ BinPack Algorithm ลงได้กว่า 40%",
    chart: `
    flowchart TD
      A[Items List] --> B[🔍 Fetch Spec & Region Rules]
      B --> C{Spec Found?}
      C -- No --> D{Known Dimensions?}
      D -- No --> E[Unknown Case]
      D -- Yes --> F[Calculate M3]
      C -- Yes --> G{Wrap Flag = True?}
      G -- Yes --> H[🔴 Wrap Case]
      G -- No --> I{M3 >= 0.15?}
      I -- Yes --> H
      I -- No --> J[🟢 Normal Case]
      F --> I
      J --> K[📋 Split Logic]
      K --> L{Unique Dims = 1?}
      L -- Yes --> M[Mono PO]
      L -- No --> N[Mixed PO]
    `
  },
  {
    step: "6-8",
    title: "Mono & SamePack Logic",
    desc: "จัดการสินค้าล็อตใหญ่ (Mass Items) ให้เป็น Full Case ก่อน",
    detail: [
      "1. Mono Check: หาก PO มีสินค้า SKU เดียว (Unique Dims = 1) -> คำนวณ Best Fit ทันที",
      "2. Overflow Handling: วนลูปสินค้าใน Mixed PO -> ตัดส่วนที่ `Qty >= Capacity` ออกเป็น Full Case",
      "3. SamePack Logic: รวมเศษสินค้า Dimensional Group เดียวกัน -> สร้างกล่องเต็มหาก `Total Qty >= Capacity`",
      "4. Remainder Transfer: เศษที่เหลือ (Remaining) จะถูกส่งต่อไปยัง Mixed Pool สำหรับ BinPack"
    ],
    objectives: [
      "Maximize Space Utilization ด้วยการจัดสินค้าขนาดเท่ากันลงกล่อง (ง่ายและแน่นที่สุด)",
      "ลดจำนวน Items ที่ต้องเข้าสู่กระบวนการ BinPack (Complex Calculation)"
    ],
    context: "80% ของปริมาตรสินค้ามักถูกจัดการจบในขั้นตอนนี้ ส่วน Mixed Pack จัดการเพียง 20% ที่เหลือ",
    chart: `
    flowchart TD
      A[PO Bucket] --> B{Is Mono PO?}
      B -- Yes --> C[🎯 Mono Best Fit]
      C --> D{Best Pkg Found?}
      D -- Yes --> E[📦 Pack All]
      
      B -- No --> F[Mixed PO]
      F --> G[🔄 Loop Items]
      G --> H{Qty >= Capacity?}
      H -- Yes --> I[📦 Pack Full Case]
      I --> J[Reduce Qty]
      J --> H
      H -- No --> K[Remainder]
      K --> L[📚 Group by Dims]
      L --> M{Group Qty >= Cap?}
      M -- Yes --> N[📦 Pack Group Full]
      M -- No --> O[📥 Send to BinPack Mixed Pool]
      N --> O
    `
  },
  {
    step: "9.1-9.5",
    title: "BinPack Path A: High Density Optimization",
    desc: "อัลกอริทึมซับซ้อนสำหรับจัดเรียงสินค้าหนาแน่นสูง (Complex 3D Fitting)",
    detail: [
      "1. Density Check: คัดกรองกลุ่มสินค้าที่มีความหนาแน่นรวม > 60% ของความจุกล่อง",
      "2. Complex Filling: ใช้ SKU หลัก (Primary) ตั้ง Stack แล้วแทรก SKU รอง (Secondary) ในช่องว่าง",
      "3. Gap Filling Formula: คำนวณ Missing Slots, Top Gap, และ Side Gap (เฉพาะกรณี VolRatio <= 3)",
      "4. Substitution Logic: หากสินค้ารองหมด ให้หา Item #3 มาเสียบแทน โดยใช้เกณฑ์:",
      "   - หาก Item #3 ใหญ่กว่า (Ratio > 1.0) -> แทนที่ 1:1",
      "   - หาก Item #3 เล็กกว่า (Ratio <= 1.0) -> แทนที่ 1:1.5"
    ],
    objectives: [
      "เติมเต็มช่องว่าง (Air Gap) ในกล่องให้ได้มากที่สุด",
      "ผสมสินค้าหลาย SKU ในกล่องเดียวได้อย่างมีประสิทธิภาพ (Multi-SKU Packing)"
    ],
    context: "Logic นี้จำลองการจัดเรียงแบบ Tetris 3 มิติ โดยให้ความสำคัญกับสินค้าชิ้นใหญ่ก่อน",
    chart: `
    flowchart TD
      A[Mixed Pool] --> B[Sort by Density]
      B --> C{Density > 60%?}
      
      C -- Yes --> D[🏗️ Complex Logic Path]
      D --> E[Set Primary Stack]
      E --> F[Calculate Gaps]
      F --> G1(Missing Slots)
      F --> G2(Top Gap)
      F --> G3(Side Gap)
      
      G1 & G2 & G3 --> H[Find Secondary Item]
      H --> I{Fits in Gap?}
      I -- Yes --> J[Insert Item #2]
      I -- No --> K{Try Item #3?}
      K -- Ratio > 1.0 --> L[Sub 1:1]
      K -- Ratio <= 1.0 --> M[Sub 1:1.5]
      
      J & L & M --> N[📦 Pack Mixed Case]
      N --> O[Deduct from Pool]
      O --> B
      
      C -- No --> P[Next: Path B]
    `
  },
  {
    step: "9.6-9.7",
    title: "BinPack Path B: Global Consolidation",
    desc: "เก็บตกสินค้าที่เหลือและปรับขนาดกล่องอัตโนมัติ (Smart Sizing)",
    detail: [
      "1. Dissolve Groups: สลายกลุ่มสินค้า Low Density (<= 60%) ทั้งหมดมารวมกัน",
      "2. Best Fit Base: เลือกกล่องตั้งต้นจากสินค้าที่มีความหนาแน่นสูงสุดในกองที่เหลือ",
      "3. Volume-Triggered Level-up: คำนวณ `Total M3` ของสินค้าทั้งหมดเทียบกับความจุกล่อง",
      "4. Auto-Scaling: หาก `Total M3 > Capacity` -> ขยับ Size กล่องขึ้นทีละระดับ (ตาม Allowed List)",
      "5. Max Split: หากขยายจนสุด Max Size แล้วยังไม่พอ -> ตัด Full Case แล้ววนลูปใหม่"
    ],
    objectives: [
      "แก้ปัญหา 'กล่องหลวม' (Low Density) โดยการรวมสินค้าหลายๆ กลุ่มเข้าด้วยกัน",
      "ลดจำนวนกล่องโดยรวม (Total Packages) ให้เหลือจำนวนน้อยที่สุด"
    ],
    context: "เป็น Safety Net สุดท้ายที่ช่วยให้มั่นใจว่า Code จะไม่สร้างกล่องเล็กๆ น้อยๆ จำนวนมากเกินความจำเป็น",
    chart: `
    flowchart TD
      A[Low Density Items] --> B[🔓 Dissolve Groups]
      B --> C[Select Base Item]
      C --> D[Find Max Package Pkg]
      D --> E[Calculate Total M3]
      
      E --> F{M3 > Capacity?}
      F -- Yes --> G[Upgrade Package Size ⬆️]
      G --> H{Reached Max?}
      H -- No --> F
      H -- Yes --> I[✂️ Split Full Case]
      I --> J[📦 Pack Max Size]
      J --> K[Remaining Items]
      K --> B
      
      F -- No --> L[📦 Pack Current Size]
      L --> M[✅ Loop Complete]
    `
  }
];

const SectionProgressRing = ({ targetRef, label }: { targetRef: React.RefObject<HTMLDivElement | null>, label: string }) => {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-[#D4AA7D]/40" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            className="text-[#7E5C4A]"
            style={{ pathLength: scrollYProgress }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#272727] group-hover:text-[#7E5C4A] transition-colors uppercase">
          {label}
        </span>
      </div>
    </div>
  );
};

const LogicNavbar = ({ sectionRefs }: { sectionRefs: React.RefObject<HTMLDivElement | null>[] }) => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [400, 500], [0, 1]);
  const y = useTransform(scrollY, [400, 500], [-20, 0]);

  return (
    <motion.div 
      style={{ opacity, y }}
      className="fixed top-0 left-0 right-0 z-100 h-16 pointer-events-none print:hidden"
    >
      <div className="container-custom h-full flex items-center justify-center pointer-events-auto">
        <div className="flex items-center gap-6">
          {StepsData.map((s, idx) => (
            <SectionProgressRing key={idx} targetRef={sectionRefs[idx]} label={s.step} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const LogicStepSection = ({ step, idx, sectionRef }: { step: StepItem, idx: number, sectionRef: React.RefObject<HTMLDivElement | null> }) => {
  return (
    <motion.section 
      ref={sectionRef}
      key={idx} 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: idx * 0.1 }}
      className="space-y-6 scroll-mt-24 print:break-inside-avoid relative"
    >
      <div className="flex items-start gap-4">
        {/* Step Badge - Simplified now that progress is global */}
        <div className="min-w-[48px] h-12 rounded-xl bg-[#EEF2F6]/95 border border-white/80 flex items-center justify-center text-[#7E5C4A] font-bold text-lg shadow-md backdrop-blur-sm whitespace-nowrap mt-1">
          {step.step}
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#272727] tracking-tight drop-shadow-sm">{step.title}</h2>
          <p className="text-[#7E5C4A] font-medium">{step.desc}</p>
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0 border-white/5 shadow-2xl">
        <div className="p-10">
          <MermaidDiagram chart={step.chart} />
        </div>
        <div className="p-10 space-y-8">
          <div className="grid md:grid-cols-2 gap-12 items-stretch">
            {/* Left Column: Objectives & Context */}
            <div className="flex flex-col gap-8 justify-center h-full">
              {/* Key Objectives Card */}
              <div className="bg-[#EEF2F6]/90 rounded-2xl p-8 border border-white/80 backdrop-blur-md shadow-xl relative overflow-hidden group hover:border-[#D4AA7D]/35 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#9ACD32]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#272727] flex items-center gap-2 mb-6 pb-4 border-b border-[#D4AA7D]/35">
                   <FileText size={16} className="text-[#7E5C4A]" /> Key Objectives
                </h3>
                <ul className="space-y-4 relative z-10">
                  {step.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex gap-3 text-[#7E5C4A] font-medium">
                      <CheckCircle2 size={18} className="text-[#9ACD32] shrink-0 mt-0.5" />
                      <span className="text-base leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Logic Context Card */}
              <div className="bg-[#EEF2F6]/90 rounded-2xl p-8 border border-white/80 backdrop-blur-md shadow-xl group hover:bg-[#EFD09E]/55 transition-colors">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#7E5C4A] mb-4 flex items-center gap-2 border-b border-[#D4AA7D]/35 pb-4">
                  <Zap size={14} className="text-[#7E5C4A]" /> Logic Context
                </h3>
                <p className="text-[#272727] text-base leading-relaxed font-medium">
                  {step.context}
                </p>
              </div>
            </div>

            {/* Right Column: Logic Process Details */}
            <div className="bg-[#EEF2F6]/90 rounded-2xl p-8 border border-white/80 backdrop-blur-md shadow-xl h-full flex flex-col flex-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#5a7a1a] flex items-center gap-2 mb-6 pb-4 border-b border-[#D4AA7D]/35">
                 <Layers size={16} /> Logic Process Detail
              </h3>
              <div className="space-y-4 flex-1">
                {step.detail.map((d: string, i: number) => (
                  <div key={i} className="flex gap-4 items-center p-4 rounded-xl hover:bg-[#EFD09E]/40 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#9ACD32]/20 text-[#5a7a1a] flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    <span className="text-[#272727] text-base leading-relaxed font-medium">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.section>
  );
};

export default function LogicDocsPage() {
  const [isPrinting, setIsPrinting] = useState(false);
  const sectionRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  const handlePrint = () => {
    setIsPrinting(true);
    // Increase delay to ensure DOM and Mermaid charts are fully rendered
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 800);
  };

  const { scrollYProgress } = useScroll();
  const heroBlur = useTransform(scrollYProgress, [0, 0.15], ["blur(0px)", "blur(12px)"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div 
      className="min-h-screen text-[#272727] pt-16 md:pt-20 px-4 md:px-8 pb-8 font-outfit overflow-x-hidden bg-[#F6EDDE] relative"
    >
      {/* Sticky Navigation Dashboard */}
      <LogicNavbar sectionRefs={sectionRefs} />
      {/* Background Glass Overlay */}
      <div className="fixed inset-0 bg-[#F6EDDE]/60 backdrop-blur-2xl pointer-events-none" />
      
      {/* Content wrapper to stay above overlay */}
      <div className="relative z-10">
      {/* Header - Hidden on print */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-4 flex items-center justify-between print:hidden"
      >
        <Link href="/projects/packaging/logic-process" className="flex items-center gap-2 text-[#7E5C4A] hover:text-[#272727] transition-colors">
          <ArrowLeft size={20} />
          <span>Back to Process</span>
        </Link>
        <button 
          onClick={handlePrint}
          className="bg-[#EEF2F6]/95 hover:bg-[#EFD09E]/55 backdrop-blur-md border border-white/80 text-[#272727] px-6 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 font-medium"
        >
          <Printer size={18} />
          <span>Export Report (PDF)</span>
        </button>
      </motion.div>

      <div className="max-w-6xl mx-auto space-y-12 pb-20 print:space-y-8 print:pb-0">
        {/* Cover Page Section */}
        <motion.div 
          style={{ filter: heroBlur, opacity: heroOpacity, scale: heroScale }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 pt-4 pb-16 border-b border-[#D4AA7D]/30 print:pt-0 print:pb-10"
        >
          <motion.div 
            whileHover={{ scale: 1.05, filter: "brightness(1.1)" }}
            whileTap={{ scale: 0.95 }}
            className="w-auto h-60 mx-auto flex items-center justify-center mb-8 relative cursor-pointer"
          >
            <Image 
              src="/images/Logo h no bg.svg" 
              alt="BPI AeroPath Logo" 
              width={600}
              height={240}
              className="h-full w-auto object-contain drop-shadow-2xl"
              priority
            />
          </motion.div>
          <motion.h1 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="text-5xl font-bold text-[#272727] italic drop-shadow-md cursor-default select-none transition-all"
          >
            Packaging Logic Documentation
          </motion.h1>
          <motion.p 
            whileHover={{ y: -2 }}
            className="text-xl text-[#7E5C4A] font-light max-w-2xl mx-auto leading-relaxed cursor-default select-none"
          >
            Detailed breakdown of the 10-step BinPack optimization engine for high-efficiency logistics.
          </motion.p>
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-sm text-[#7E5C4A]">
              <Database size={14} />
              <span>Data Source Root</span>
            </div>
            <div className="w-1 h-1 bg-[#7E5C4A]/60 rounded-full" />
            <div className="flex items-center gap-2 text-sm text-[#7E5C4A]">
              <Zap size={14} />
              <span>Auto-Scaling Logic</span>
            </div>
          </div>
        </motion.div>

        {/* Logic Sections */}
        {StepsData.map((s, idx) => (
          <LogicStepSection key={idx} step={s} idx={idx} sectionRef={sectionRefs[idx]} />
        ))}

        {/* Accuracy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 mb-10"
        >
          <div className="relative p-8 rounded-3xl bg-[#EEF2F6]/95 border border-white/80 backdrop-blur-xl shadow-2xl shadow-[#272727]/15 overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#7E5C4A]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-[#9ACD32]/10 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#D4AA7D]/40" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#9ACD32]" strokeDasharray="364" strokeDashoffset="18" strokeLinecap="round" />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#272727]">95-97%</span>
                    <span className="text-[10px] font-bold text-[#5a7a1a] uppercase tracking-widest">Accuracy</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#7E5C4A] flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[#9ACD32]" /> Confirmed Calculation
                </p>
              </div>

              {/* Insights */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-[#272727] flex items-center gap-2">
                  <TrendingUp className="text-[#7E5C4A]" size={20} />
                  Calculation Accuracy Insights
                </h3>
                <p className="text-sm text-[#7E5C4A] leading-relaxed">
                  จากการประเมินกระบวนการ Logic ทั้งหมด ระบบมีความแม่นยำในการคำนวณเฉลี่ยอยู่ที่ <strong>95 - 97%</strong> เมื่อเทียบกับการแพ็คจริงหน้างาน โดยอ้างอิงจากฐานข้อมูลและเงื่อนไขการตรวจสอบดังนี้:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-white/40 rounded-xl border border-white/60">
                    <h4 className="text-xs font-bold text-[#272727] flex items-center gap-1 mb-1 italic">
                      🎯 Confirmed Rules (98%+)
                    </h4>
                    <p className="text-[11px] text-[#7E5C4A] leading-tight">
                      กลุ่ม SamePack, Mono และ Wrap ใช้ค่าคงที่จากฐานข้อมูลที่ได้รับการยืนยันแล้ว ทำให้ผลลัพธ์มีความคงที่สูงมาก
                    </p>
                  </div>
                  <div className="p-3 bg-white/40 rounded-xl border border-white/60">
                    <h4 className="text-xs font-bold text-[#272727] flex items-center gap-1 mb-1 italic">
                      🛡️ Safe-Fail Mechanism
                    </h4>
                    <p className="text-[11px] text-[#7E5C4A] leading-tight">
                      ระบบจะคัดแยกกลุ่ม Unknown Spec ออกจากการคำนวณอัตโนมัติหากข้อมูลไม่เพียงพอ เพื่อป้องกันความผิดพลาดเชิงพื้นที่
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-start gap-2 px-4 italic">
            <AlertCircle size={14} className="text-[#7E5C4A] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#7E5C4A]/70 leading-relaxed">
              *หมายเหตุ: ความคลาดเคลื่อน 3-5% อาจเกิดขึ้นจากปัจจัยทางกายภาพหน้างาน เช่น วัสดุกันกระแทก (Dunnage), ความยืดหยุ่นของบรรจุภัณฑ์ และการจัดวาง Palette ของพนักงาน
            </p>
          </div>
        </motion.div>

        {/* Footer Section */}
        <div className="pt-10 text-center space-y-4 opacity-50 print:pt-10">
          <p className="text-sm">BPI AeroPath System - Advanced Logistics Division</p>
          <p className="text-xs">Confidential & Internal Process Flowchart © 2026</p>
        </div>
      </div>

      {/* Printing Overlay */}
      {isPrinting && (
        <div className="fixed inset-0 bg-[#EEF2F6]/95 z-9999 flex items-center justify-center text-[#272727]">
          <p className="text-xl font-medium animate-pulse">Preparing Report for PDF Export...</p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { 
            background: white !important; 
            color: black !important;
          }
          .min-h-screen { background: white !important; }
          h1, h2, h3, p, span, li { color: black !important; }
          .bg-[#272727]\/50 { background: white !important; }
          .bg-white\/5 { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .border-white\/5, .border-white\/10, .border-white\/20 { border-color: #e2e8f0 !important; }
          .bg-linear-to-r, .bg-linear-to-tr { background: none !important; -webkit-background-clip: unset !important; color: black !important; -webkit-text-fill-color: black !important; }
          .shadow-2xl, .shadow-lg, .shadow-inner { shadow: none !important; }
          .text-[#7E5C4A], .text-[#D4AA7D], .text-[#9ACD32], .text-[#272727] { color: #475569 !important; }
          /* Ensure SVGs scale properly */
          .MermaidDiagram svg { max-width: 100% !important; height: auto !important; }
          /* Hide the preparing overlay when printing */
          .fixed.inset-0.bg-white.z-\[9999\] { display: none !important; }
        }
      `}</style>
      </div>
    </div>
  );
}
