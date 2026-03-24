"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FileSpreadsheet, 
  RotateCcw, 
  Play, 
  Box, 
  Layers, 
  Archive,
  Download,
  CheckCircle2,
  Package,
  FileText,
  Search,
  Users,
  Save,
  Clock,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { CUSTOMER_PACK_TYPE_MAPPING, PACKAGE_MASTER_DATA } from "@/lib/config/packagingData";
import { PackagingService } from "@/lib/firebase/services/packaging.service";
import { PackingLogicService } from "@/lib/services/packing-logic/PackingLogicService";
import type { PackingInput, PackingOutput, PackedCase, PackingPlanResult } from "@/lib/services/packing-logic/packing.types";
// Removed static imports for PDF generators to optimize bundle size

import { AdjustmentToolbar } from "@/components/projects/packaging/planning/AdjustmentToolbar";
import { EditableCaseRow } from "@/components/projects/packaging/planning/EditableCaseRow";
import { PackingDetailsExportDialog } from "@/components/projects/packaging/planning/PackingDetailsExportDialog";
import type { AdjustmentValidationResult, POCase, PlanAdjustmentRecord, PlanAdjustmentOp } from "@/lib/planning/adjustments.types";
import { createAdjustmentRecord, clonePlanResult, summarizePlan } from "@/lib/planning/adjustments.helpers";
import { applyAdjustment, applyAdjustments } from "@/lib/planning/adjustments.reducer";
import { buildExpectedQtyMap, validateAdjustedResult } from "@/lib/planning/adjustments.validation";
import { buildPackingDetailSheetEntries, summarizePoNos } from "@/lib/packing-details/export.helpers";
import type { PackingDetailsExportOptions } from "@/lib/packing-details/export.types";
import { useAuth } from "@/lib/hooks/useAuth";

interface PlanSummary {
  totalPallets: number;
  totalBoxes: number;
  totalWarps: number;
  totalM3: number;
  totalItems: number;
}

interface RecentPlan {
  id: string;
  customer: { name: string; region: string };
  summary: PlanSummary;
  createdAt: { seconds: number; nanoseconds: number };
  activityUser?: string;
  data?: string; // Legacy JSON string
  baseData?: string; // JSON string
  effectiveData?: string; // JSON string
  adjustments?: PlanAdjustmentRecord[];
  poList: string[];
}

interface CustomerFormState {
  code: string;
  type: "A" | "E" | "R";
}

interface SplitDraft {
  po: string;
  caseNo: number;
  sku: string;
  qty: number;
  packageName: string;
}

interface MergeDraft {
  po: string;
  caseNos: number[];
  packageName: string;
}

interface SkuDimension {
  width: number;
  length: number;
  height: number;
}

export default function PackagingBookingPage() {
  const { user } = useAuth();
  const [customerPackTypeMapping, setCustomerPackTypeMapping] = useState<Record<string, string>>(
    () => ({ ...CUSTOMER_PACK_TYPE_MAPPING })
  );
  const [activeStep, setActiveStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<{code: string; region: string} | null>(null);
  const [rawData, setRawData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [basePlanResult, setBasePlanResult] = useState<POCase[]>([]);
  const [planResult, setPlanResult] = useState<POCase[]>([]);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [adjustmentRecords, setAdjustmentRecords] = useState<PlanAdjustmentRecord[]>([]);
  const [redoRecords, setRedoRecords] = useState<PlanAdjustmentRecord[]>([]);
  const [validationResult, setValidationResult] = useState<AdjustmentValidationResult>({ errors: [], warnings: [] });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCaseKeys, setSelectedCaseKeys] = useState<Record<string, boolean>>({});
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null);
  const [splitQtyInput, setSplitQtyInput] = useState("");
  const [mergeDraft, setMergeDraft] = useState<MergeDraft | null>(null);
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPlan, setIsExportingPlan] = useState(false);
  const [isExportingPackingDetails, setIsExportingPackingDetails] = useState(false);
  const [isLoadingShipmentOptions, setIsLoadingShipmentOptions] = useState(false);
  const [isPackingDetailsDialogOpen, setIsPackingDetailsDialogOpen] = useState(false);
  const [shipmentOptions, setShipmentOptions] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomerCode, setEditingCustomerCode] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({ code: "", type: "E" });
  const [pendingDeleteCustomerCode, setPendingDeleteCustomerCode] = useState<string | null>(null);
  const [skuDimensions, setSkuDimensions] = useState<Record<string, SkuDimension>>({});
  const savePlanInFlightRef = useRef(false);

  // --- Load History on Mount ---
  useEffect(() => {
      loadHistory();
  }, []);

  const loadHistory = async () => {
      const history = await PackagingService.getRecentPackingPlans(6);
      setRecentPlans(history as unknown as RecentPlan[]);
  };

  const selectedPackType = useMemo<"A" | "E" | "R">(() => {
    if (!selectedCustomer) return "E";
    if (selectedCustomer.region === "US/EU") return "E";
    if (selectedCustomer.region === "R") return "R";
    return "A";
  }, [selectedCustomer]);

  const availablePackages = useMemo(
    () => PACKAGE_MASTER_DATA.filter((pkg) => pkg.types.includes(selectedPackType)),
    [selectedPackType]
  );

  const expectedQtyMap = useMemo(() => buildExpectedQtyMap(rawData), [rawData]);
  const totalNoCount = useMemo(() => planResult.reduce((sum, poGroup) => sum + poGroup.cases.length, 0), [planResult]);
  const poSummaries = useMemo(() => summarizePoNos(planResult), [planResult]);
  const planSkus = useMemo(
    () =>
      Array.from(
        new Set(
          planResult.flatMap((poGroup) => poGroup.cases.flatMap((caseItem) => caseItem.items.map((item) => item.sku)))
        )
      ),
    [planResult]
  );

  const updateWorkingPlan = (next: POCase[]) => {
    setPlanResult(next);
    setPlanSummary(summarizePlan(next));
    setValidationResult(validateAdjustedResult(next, expectedQtyMap));
  };

  const applyOperation = (op: PlanAdjustmentOp) => {
    const next = applyAdjustment(planResult, op);
    if (JSON.stringify(next) === JSON.stringify(planResult)) return;

    updateWorkingPlan(next);
    setAdjustmentRecords((prev) => [...prev, createAdjustmentRecord(op)]);
    setRedoRecords([]);
    setSelectedCaseKeys({});
    setIsHistoryMode(false);
  };

  const resetAdjustments = (baseData: POCase[]) => {
    const cloned = clonePlanResult(baseData);
    setBasePlanResult(cloned);
    updateWorkingPlan(cloned);
    setAdjustmentRecords([]);
    setRedoRecords([]);
    setSelectedCaseKeys({});
    setIsEditMode(false);
  };

  const caseKey = (po: string, caseNo: number) => `${po}|${caseNo}`;

  const getCase = (po: string, caseNo: number): PackedCase | undefined => {
    const poGroup = planResult.find((g) => g.po === po);
    return poGroup?.cases.find((c) => c.caseNo === caseNo);
  };

  const selectedCaseNosByPo = (po: string): number[] => {
    return Object.entries(selectedCaseKeys)
      .filter(([key, selected]) => selected && key.startsWith(`${po}|`))
      .map(([key]) => Number(key.split("|")[1]))
      .filter((value) => Number.isFinite(value));
  };

  useEffect(() => {
    if (planResult.length === 0) {
      setValidationResult({ errors: [], warnings: [] });
      return;
    }
    setValidationResult(validateAdjustedResult(planResult, expectedQtyMap));
  }, [expectedQtyMap, planResult]);

  useEffect(() => {
    const missingSkus = planSkus.filter((sku) => !skuDimensions[sku]);
    if (missingSkus.length === 0) return;

    let cancelled = false;

    void (async () => {
      const fetchedEntries = await Promise.all(
        missingSkus.map(async (sku) => {
          const spec = await PackagingService.getProductSpec(sku);
          if (!spec) return null;
          return [
            sku,
            {
              width: spec.width,
              length: spec.length,
              height: spec.height,
            },
          ] as const;
        })
      );

      if (cancelled) return;

      const nextEntries = fetchedEntries.filter((entry): entry is readonly [string, SkuDimension] => !!entry);
      if (nextEntries.length === 0) return;

      setSkuDimensions((prev) => ({
        ...prev,
        ...Object.fromEntries(nextEntries),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [planSkus, skuDimensions]);

  const handleLoadPlan = (plan: RecentPlan) => {
      try {
          const effectivePayload = plan.effectiveData || plan.data || "[]";
          const parsedData = JSON.parse(effectivePayload) as POCase[];
          const parsedBase = plan.baseData ? (JSON.parse(plan.baseData) as POCase[]) : parsedData;

          setPlanResult(parsedData);
          setBasePlanResult(parsedBase);
          setPlanSummary(summarizePlan(parsedData));
          setValidationResult(validateAdjustedResult(parsedData, expectedQtyMap));
          setAdjustmentRecords(Array.isArray(plan.adjustments) ? plan.adjustments : []);
          setRedoRecords([]);
          setSelectedCaseKeys({});
          setIsEditMode(false);
          setSelectedCustomer({ code: plan.customer.name, region: plan.customer.region });
          setActiveStep(3); // Go to Review
          setIsHistoryMode(true);
      } catch (e) {
          console.error("Failed to load plan", e);
      }
  };

  // --- Save Plan ---
  const handleSavePlan = async () => {
      if (
        savePlanInFlightRef.current ||
        !planResult.length ||
        !selectedCustomer
      ) return;
      if (validationResult.errors.length > 0) {
        alert("Please resolve validation errors before saving.");
        return;
      }
      if (isHistoryMode && adjustmentRecords.length === 0) {
        alert("This saved plan has no new changes to save.");
        return;
      }
      savePlanInFlightRef.current = true;
      setIsSaving(true);
      
      try {
          const dataToSave = {
              customer: { id: selectedCustomer.code, name: selectedCustomer.code, region: selectedCustomer.region },
              summary: planSummary!,
              poList: planResult.map(p => p.po),
              data: JSON.stringify(planResult),
              baseData: JSON.stringify(basePlanResult.length ? basePlanResult : planResult),
              effectiveData: JSON.stringify(planResult),
              adjustments: adjustmentRecords,
              hasManualAdjustment: adjustmentRecords.length > 0,
              adjustmentCount: adjustmentRecords.length,
              activityUser: user?.displayName || user?.email || "System"
          };
          
          const result = await PackagingService.savePackingPlan(dataToSave);
          if (result.success) {
              // alert("Plan saved successfully!"); // Removed alert
              setShowSuccessModal(true); // Show Modal
              setIsHistoryMode(true); // Disable save button
              loadHistory(); // Refresh history
          } else if (result.duplicate) {
              alert("This plan already exists in Recent Calculations. Duplicate save was blocked.");
          } else {
              alert("Failed to save plan.");
          }
      } catch (e) {
          console.error("Save error", e);
          alert("Error saving plan.");
      } finally {
          savePlanInFlightRef.current = false;
          setIsSaving(false);
      }
  };

  // --- 1. Customer Selection ---
  const handleCustomerSelect = (code: string) => {
    const type = customerPackTypeMapping[code] || "E";
    const region = type === "A" ? "Asia" : type === "R" ? "R" : "US/EU";
    setSelectedCustomer({ code, region });
    setActiveStep(2);
  };

  const openCustomerForm = (code?: string) => {
    setIsCustomerFormOpen(true);
    if (code) {
      const type = customerPackTypeMapping[code] === "A" ? "A" : customerPackTypeMapping[code] === "R" ? "R" : "E";
      setEditingCustomerCode(code);
      setCustomerForm({ code, type });
      return;
    }
    setEditingCustomerCode(null);
    setCustomerForm({ code: "", type: "E" });
  };

  const closeCustomerForm = () => {
    setIsCustomerFormOpen(false);
    setEditingCustomerCode(null);
    setCustomerForm({ code: "", type: "E" });
  };

  const saveCustomer = () => {
    const code = customerForm.code.trim().toUpperCase();
    if (!code) {
      alert("Customer code is required.");
      return;
    }

    if (!editingCustomerCode && customerPackTypeMapping[code]) {
      alert("Customer already exists.");
      return;
    }

    const type = customerForm.type;
    setCustomerPackTypeMapping((prev) => ({ ...prev, [code]: type }));

    if (selectedCustomer?.code === code || selectedCustomer?.code === editingCustomerCode) {
      setSelectedCustomer({ code, region: type === "A" ? "Asia" : type === "R" ? "R" : "US/EU" });
    }

    closeCustomerForm();
  };

  const confirmDeleteCustomer = (code: string) => {

    setCustomerPackTypeMapping((prev) => {
      if (Object.keys(prev).length <= 1) {
        alert("At least one customer must remain.");
        return prev;
      }
      const next = { ...prev };
      delete next[code];
      return next;
    });

    if (selectedCustomer?.code === code) {
      setSelectedCustomer(null);
      setActiveStep(1);
    }

    if (editingCustomerCode === code) {
      closeCustomerForm();
    }

    setPendingDeleteCustomerCode(null);
  };

  const deleteCustomer = (code: string) => {
    setPendingDeleteCustomerCode(code);
  };

  // --- 2. Data Input ---
  const handleRawInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawData(e.target.value);
  };

  const handleSampleData = () => {
    const sample = `PO1001\tSKU-INV-001\t500\nPO1001\tSKU-BAT-X1\t20\nPO1002\tSKU-INV-002\t1200`;
    setRawData(sample);
  };

  // --- 3. Generate Plan (Using PackingLogicService) ---
  const handleGeneratePlan = async () => {
    if (!rawData || !selectedCustomer) return;
    setIsProcessing(true);
    setBasePlanResult([]);
    setPlanResult([]);
    setPlanSummary(null);
    setAdjustmentRecords([]);
    setRedoRecords([]);
    setSelectedCaseKeys({});
    setIsEditMode(false);
    setValidationResult({ errors: [], warnings: [] });
    setSkuDimensions({});

    try {
      // 1. Initialize Service
      const regionCode = selectedCustomer.region === 'US/EU' ? 'E' : selectedCustomer.region === 'R' ? 'R' : 'A';
      
      const nextSkuDimensions: Record<string, SkuDimension> = {};
      const service = new PackingLogicService(
        { region: regionCode as 'E' | 'A' | 'R' },
        PACKAGE_MASTER_DATA,
        async (sku: string) => {
           // Fetch from Firebase
           const spec = await PackagingService.getProductSpec(sku);
           if (!spec) return null;
           nextSkuDimensions[sku] = {
             width: spec.width,
             length: spec.length,
             height: spec.height,
           };
           // Map DTO to internal format if needed 
           // (PackingLogicService handles DTO structure internally now if names match, otherwise mapping needed)
           return spec;
        }
      );
      
      // 2. Prepare Input
      const input: PackingInput = {
        rawData,
        config: { region: regionCode as 'E' | 'A' | 'R' }
      };

      // 3. Execute
      const output: PackingOutput = await service.execute(input);

      // 4. Map Output to UI State
      const mappedResults: POCase[] = [];

      output.results.forEach((res) => {
         const allCases = [
             ...res.warpCases,
             ...res.unknownCases,
             ...res.monoCases,
             ...res.sameCases,
             ...res.mixedCases
         ].sort((a, b) => a.caseNo - b.caseNo);

         if (allCases.length > 0) {
             mappedResults.push({
                 po: res.po,
                 cases: allCases
             });
         }
      });

      const normalized = clonePlanResult(mappedResults);
      setBasePlanResult(normalized);
      setPlanResult(normalized);
      setPlanSummary(summarizePlan(normalized));
      setValidationResult(validateAdjustedResult(normalized, expectedQtyMap));
      setSkuDimensions(nextSkuDimensions);
      
      setActiveStep(3);
      setIsHistoryMode(false);

    } catch (error) {
      console.error("Planning Error:", error);
      alert("Failed to generate plan. Please check input data.");
    } finally {
      setIsProcessing(false);
    }
  };

  const buildPackingPlanPdfData = (): PackingPlanResult[] => {
    return planResult.map(po => ({
      po: po.po,
      cases: po.cases,
      summary: {
        totalPallets: po.cases.filter(c => c.type.includes("Pallet")).length,
        totalBoxes: po.cases.filter(c => c.type.includes("Box")).length,
        totalItems: po.cases.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0), 0)
      }
    }));
  };

  const handleDownload = async () => {
    if (!planResult.length || !selectedCustomer || isExportingPlan) return;
    if (validationResult.errors.length > 0) {
      alert("Please resolve validation errors before exporting PDF.");
      return;
    }

    setIsExportingPlan(true);
    const pdfData = buildPackingPlanPdfData();
    const poList = planResult.map((p) => p.po);
    const totalItemsRequired = planSummary?.totalItems || 0;

    try {
      const { generatePackingListPDFMake } = await import(
        "@/lib/utils/pdfMakeGenerator"
      );
      await generatePackingListPDFMake(
        pdfData,
        selectedCustomer.code,
        poList,
        totalItemsRequired
      );
    } catch (error) {
      console.error("PDF export failed.", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsExportingPlan(false);
    }
  };

  const handleExportPackingDetails = async () => {
    if (!planResult.length || !selectedCustomer) return;
    if (validationResult.errors.length > 0) {
      alert("Please resolve validation errors before exporting.");
      return;
    }

    setIsLoadingShipmentOptions(true);
    try {
      const inverterConsignees = await PackagingService.getInverterConsigneeOptions();
      const merged = Array.from(new Set([selectedCustomer.code, ...inverterConsignees]));
      setShipmentOptions(merged);
      setIsPackingDetailsDialogOpen(true);
    } finally {
      setIsLoadingShipmentOptions(false);
    }
  };

  const handleConfirmExportPackingDetails = async (options: PackingDetailsExportOptions) => {
    if (!planResult.length || !selectedCustomer) return;

    const built = buildPackingDetailSheetEntries(planResult, options);
    if (built.errors.length > 0) {
      alert(built.errors[0]);
      return;
    }

    setIsExportingPackingDetails(true);
    try {
      const { generatePackingDetailsPDF } = await import("@/lib/utils/pdfTemplateGenerator");
      await generatePackingDetailsPDF(built.entries, selectedCustomer.code);
      setIsPackingDetailsDialogOpen(false);
    } finally {
      setIsExportingPackingDetails(false);
    }
  };

  const handleEnterEditMode = () => {
    if (!planResult.length) return;
    if (!basePlanResult.length) {
      setBasePlanResult(clonePlanResult(planResult));
    }
    setIsEditMode(true);
    setIsHistoryMode(false);
  };

  const handleExitEditMode = () => {
    setIsEditMode(false);
    setSelectedCaseKeys({});
  };

  const handleUndo = () => {
    if (adjustmentRecords.length === 0) return;

    const latest = adjustmentRecords[adjustmentRecords.length - 1];
    const nextRecords = adjustmentRecords.slice(0, -1);
    const rebuilt = applyAdjustments(basePlanResult, nextRecords.map((r) => r.op));

    setAdjustmentRecords(nextRecords);
    setRedoRecords((prev) => [latest, ...prev]);
    updateWorkingPlan(rebuilt);
  };

  const handleRedo = () => {
    if (redoRecords.length === 0) return;

    const [nextRecord, ...rest] = redoRecords;
    const nextAdjustmentRecords = [...adjustmentRecords, nextRecord];
    const rebuilt = applyAdjustments(basePlanResult, nextAdjustmentRecords.map((r) => r.op));

    setRedoRecords(rest);
    setAdjustmentRecords(nextAdjustmentRecords);
    updateWorkingPlan(rebuilt);
  };

  const handleDiscardChanges = () => {
    resetAdjustments(basePlanResult.length ? basePlanResult : planResult);
  };

  const handleToggleCaseSelected = (po: string, caseNo: number, selected: boolean) => {
    const key = caseKey(po, caseNo);
    setSelectedCaseKeys((prev) => ({ ...prev, [key]: selected }));
  };

  const handleUpdateQty = (po: string, caseNo: number, sku: string, qty: number) => {
    applyOperation({
      type: "update_item_qty",
      po,
      caseNo,
      sku,
      qty,
    });
  };

  const handleUpdateNote = (po: string, caseNo: number, note: string) => {
    applyOperation({
      type: "update_case_note",
      po,
      caseNo,
      note,
    });
  };

  const handleChangePackage = (po: string, caseNo: number, packageName: string) => {
    const packageDef = availablePackages.find((pkg) => pkg.name === packageName);
    if (!packageDef) return;

    applyOperation({
      type: "change_case_package",
      po,
      caseNo,
      packageName,
      dims: packageDef.name,
      caseType: `Manual ${packageDef.category}`,
    });
  };

  const openSplitCase = (po: string, caseNo: number) => {
    const target = getCase(po, caseNo);
    if (!target || target.items.length === 0) {
      alert("Cannot split an empty case.");
      return;
    }

    const firstItem = target.items[0];
    const fallbackPackage = availablePackages.find((pkg) => pkg.name === target.dims)?.name || availablePackages[0]?.name || "";
    const suggestedQty = Math.max(1, Math.floor(firstItem.qty / 2));

    const initialQty = suggestedQty >= firstItem.qty ? 1 : suggestedQty;
    setSplitDraft({
      po,
      caseNo,
      sku: firstItem.sku,
      qty: initialQty,
      packageName: fallbackPackage,
    });
    setSplitQtyInput(String(initialQty));
  };

  const confirmSplitCase = () => {
    if (!splitDraft) return;

    const sourceCase = getCase(splitDraft.po, splitDraft.caseNo);
    const sourceItem = sourceCase?.items.find((item) => item.sku === splitDraft.sku);
    const packageDef = availablePackages.find((pkg) => pkg.name === splitDraft.packageName);
    if (!sourceCase || !sourceItem || !packageDef) return;

    const parsedQty = Number(splitQtyInput);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0 || parsedQty > sourceItem.qty) {
      alert(`Split qty must be between 1 and ${sourceItem.qty}.`);
      return;
    }

    applyOperation({
      type: "split_case",
      po: splitDraft.po,
      caseNo: splitDraft.caseNo,
      sku: splitDraft.sku,
      qty: Math.floor(parsedQty),
      packageName: packageDef.name,
      dims: packageDef.name,
      caseType: `Manual Split ${packageDef.category}`,
    });
    setSplitDraft(null);
    setSplitQtyInput("");
  };

  const openMergeCases = (po: string) => {
    const selectedCaseNos = selectedCaseNosByPo(po);
    if (selectedCaseNos.length < 2) {
      alert("Select at least 2 cases in the same PO to merge.");
      return;
    }

    const firstSelected = getCase(po, selectedCaseNos[0]);
    setMergeDraft({
      po,
      caseNos: selectedCaseNos.sort((a, b) => a - b),
      packageName: firstSelected?.dims || availablePackages[0]?.name || "",
    });
  };

  const confirmMergeCases = () => {
    if (!mergeDraft) return;
    const packageDef = availablePackages.find((pkg) => pkg.name === mergeDraft.packageName);
    if (!packageDef) return;

    applyOperation({
      type: "merge_cases",
      po: mergeDraft.po,
      caseNos: mergeDraft.caseNos,
      packageName: packageDef.name,
      dims: packageDef.name,
      caseType: `Manual Merge ${packageDef.category}`,
    });
    setMergeDraft(null);
  };

  // --- 4. Steps Navigation ---
  const steps = [
    { id: 1, label: "Select Customer", icon: Users },
    { id: 2, label: "Input Data", icon: FileText },
    { id: 3, label: "Review Plan", icon: CheckCircle2 },
    { id: 4, label: "Save Plan", icon: Save },
  ];

  const proceedToSaveButtonClass = "group h-12 px-8 rounded-xl border border-[#E6E6E6] bg-gradient-to-br from-[#FFFFFF] via-[#F5F5F5] to-[#EBEBEB] text-[#4F4B64] font-bold shadow-[8px_8px_16px_rgba(160,160,160,0.25),-6px_-6px_14px_rgba(255,255,255,0.9)] transition-all hover:border-[#272727] hover:text-[#EFD09E] hover:bg-gradient-to-br hover:from-[#3A374F] hover:via-[#272727] hover:to-[#1F1D2B] hover:shadow-[10px_12px_20px_rgba(39,38,53,0.35)] flex items-center gap-2";

  const getCaseAccuracyScore = (c: PackedCase): number => {
    const type = (c.type || "").toLowerCase();
    const note = (c.note || "").toLowerCase();

    if (type.includes("unknown") || type.includes("warp") || type.includes("wrap")) return 100;
    if (type.includes("mixed")) {
      if (note.includes("primary:")) return 94;
      return 80;
    }
    return 98;
  };

  const weightedAccuracy = planResult.reduce(
    (acc, po) => {
      po.cases.forEach((c) => {
        const qty = c.items.reduce((sum, it) => sum + it.qty, 0);
        const score = getCaseAccuracyScore(c);
        acc.weightedScore += score * qty;
        acc.totalQty += qty;
      });
      return acc;
    },
    { weightedScore: 0, totalQty: 0 }
  );

  const accuracyRateText =
    weightedAccuracy.totalQty > 0
      ? `${(weightedAccuracy.weightedScore / weightedAccuracy.totalQty).toFixed(2)}%`
      : "N/A";

  return (
    <div className="min-h-screen bg-[#F6EDDE] pt-20 pb-20">
      <section className="py-8">
        <div className="container-custom">
          
          <ModuleHeader
             title="Pack Planning"
             description="Generate packing plans from raw PO data."
             backHref="/projects/packaging"
             backLabel="Packaging Console"
          >
             {/* Stepper */}
             <div className="mt-8 flex items-center justify-center mb-12">
                <div className="flex items-center gap-4">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                            <div className={`
                                flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                                ${activeStep === step.id 
                                    ? 'border-[#D4AA7D]/50 bg-[#EFD09E]/70 text-[#272727]' 
                                    : activeStep > step.id 
                                        ? 'border-[#9ACD32]/50 bg-[#9ACD32]/15 text-[#5a7a1a]' 
                                        : 'border-[#D4AA7D]/35 text-[#7E5C4A]'
                                }
                            `}>
                                <div className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                    ${activeStep === step.id ? 'bg-[#272727] text-[#EFD09E]' : activeStep > step.id ? 'bg-[#9ACD32] text-[#272727]' : 'bg-[#D4AA7D]/35 text-[#7E5C4A]'}
                                `}>
                                    {step.id}
                                </div>
                                <span className="font-bold text-sm">{step.label}</span>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className="w-8 h-0.5 bg-[#D4AA7D]/40 mx-2" />
                            )}
                        </div>
                    ))}
                </div>
             </div>

             {/* Content Area */}
             <div className="max-w-5xl mx-auto">
                 
                 {/* STEP 1: Customer Selection */}
                 {activeStep === 1 && (
                     <GlassCard className="relative overflow-hidden p-8 rounded-[2rem] border border-[#F3F3F3] bg-gradient-to-br from-[#FDFDFD] via-[#F4F4F4] to-[#ECECEC] shadow-[14px_14px_30px_rgba(177,177,177,0.3),-12px_-12px_26px_rgba(255,255,255,0.95),inset_2px_2px_1px_rgba(255,255,255,0.92),inset_-3px_-4px_8px_rgba(180,180,180,0.22)] animate-in fade-in slide-in-from-bottom-4">
                         <div className="pointer-events-none absolute -top-20 right-[-60px] h-52 w-52 rounded-full bg-white/75 blur-2xl" />
                         <div className="pointer-events-none absolute -bottom-16 left-[-40px] h-44 w-44 rounded-full bg-[#DCDCDC]/35 blur-2xl" />
                         <div className="relative mb-6 flex items-center justify-between gap-4">
                            <h3 className="text-xl font-bold text-[#3F2814] flex items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#EAC9A3] bg-gradient-to-br from-[#FFF0D5] to-[#E7BE8A] shadow-[5px_5px_10px_rgba(166,110,54,0.22),-4px_-4px_10px_rgba(255,245,225,0.8)]">
                                   <Search className="w-4 h-4 text-[#7E5C4A]"/>
                                </span>
                                Select Customer Preset
                            </h3>
                            <button
                                type="button"
                                onClick={() => openCustomerForm()}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#D4AA7D]/55 bg-[#F8E3C0]/80 text-[#4F3A2A] text-sm font-bold transition-colors hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                            >
                                <Plus className="w-4 h-4" />
                                Manage Customers
                            </button>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {Object.keys(customerPackTypeMapping).sort().map(code => (
                                 <button
                                     key={code}
                                     onClick={() => handleCustomerSelect(code)}
                                     className={`
                                        p-4 rounded-2xl border text-left transition-all duration-200 group
                                        ${selectedCustomer?.code === code
                                           ? "border-[#D1914F] bg-gradient-to-br from-[#FCE8C8] to-[#E8C090] shadow-[inset_2px_2px_1px_rgba(255,245,229,0.9),inset_-4px_-5px_10px_rgba(167,108,49,0.24),8px_10px_16px_rgba(165,108,54,0.22)] ring-2 ring-[#D1914F]/45"
                                           : "border-[#EAC9A3] bg-gradient-to-br from-[#FAE7C8] to-[#EAC394] shadow-[10px_12px_20px_rgba(160,103,48,0.22),-6px_-6px_14px_rgba(255,244,223,0.85),inset_1px_1px_0_rgba(255,246,230,0.85)] hover:border-[#272727] hover:bg-gradient-to-br hover:from-[#3A374F] hover:to-[#1F1D2B] hover:translate-y-[1px] hover:shadow-[7px_8px_14px_rgba(39,38,53,0.36),-4px_-4px_10px_rgba(255,244,223,0.45),inset_1px_1px_0_rgba(255,255,255,0.12)] active:translate-y-[3px] active:shadow-[inset_2px_2px_2px_rgba(255,255,255,0.08),inset_-3px_-3px_6px_rgba(9,9,14,0.4)]"
                                        }
                                     `}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-bold text-base text-[#3B2B1F] group-hover:text-[#EFD09E] leading-none">{code}</div>
                                        <div className="text-[11px] leading-none text-[#7E5C4A] font-semibold bg-[#FAEFD9]/88 border border-[#D4AA7D]/38 px-2 py-1 rounded-lg shadow-[inset_1px_1px_0_rgba(255,247,232,0.9)] group-hover:bg-[#3A374F] group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/55">
                                            {customerPackTypeMapping[code] === 'A' ? 'Asia Region' : customerPackTypeMapping[code] === 'R' ? 'R Region' : 'US/EU Region'}
                                        </div>
                                    </div>
                                </button>
                             ))}
                         </div>

                          {/* Recent History Section */}
                          <div className="pt-6 border-t border-[#D4AA7D]/35 mt-6">
                                <h4 className="text-sm font-bold text-[#7E5C4A] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4"/> Recent Calculations
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {recentPlans.map(plan => (
                                        <button 
                                            key={plan.id}
                                            onClick={() => handleLoadPlan(plan)}
                                            className="p-4 bg-gradient-to-br from-[#F8E0BC] to-[#E9C08F] border border-[#D9AE7E]/55 rounded-2xl text-left transition-all duration-200 group shadow-[8px_9px_16px_rgba(161,104,47,0.2),-4px_-4px_10px_rgba(255,244,224,0.75),inset_1px_1px_0_rgba(255,247,231,0.85)] hover:-translate-y-1 hover:scale-[1.01] hover:border-[#272727] hover:bg-gradient-to-br hover:from-[#3A374F] hover:to-[#1F1D2B] hover:shadow-[12px_14px_24px_rgba(39,38,53,0.34),-4px_-4px_10px_rgba(255,244,224,0.4),inset_1px_1px_0_rgba(255,255,255,0.12)]"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-[#3B2B1F] group-hover:text-[#EFD09E]">{plan.customer.name}</span>
                                                <span className="text-[10px] bg-[#FAE7C8]/85 border border-[#D4AA7D]/45 text-[#7E5C4A] px-1.5 py-0.5 rounded-md shadow-[inset_1px_1px_0_rgba(255,247,232,0.9)] group-hover:bg-[#3A374F] group-hover:text-[#EFD09E] group-hover:border-[#EFD09E]/55">
                                                    {plan.createdAt?.seconds ? new Date(plan.createdAt?.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-[#6F4E3D] space-y-1 group-hover:text-[#EFD09E]">
                                                <div className="flex justify-between">
                                                    <span>POs: {plan.poList.length}</span>
                                                    <span>Item: {plan.summary.totalItems}</span>
                                                </div>
                                                <div className="flex justify-between font-medium text-[#3B2B1F] group-hover:text-[#EFD09E]">
                                                    <span>Package: {plan.summary.totalPallets + plan.summary.totalBoxes + plan.summary.totalWarps}</span>
                                                    <span>{plan.activityUser || 'System'}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {recentPlans.length === 0 && (
                                        <div className="col-span-3 text-center py-8 text-[#7E5C4A]/80 text-sm italic bg-[#EFD09E]/45 rounded-xl border border-dashed border-[#D4AA7D]/45">
                                            No recent history found.
                                        </div>
                                    )}
                                </div>
                          </div>
                     </GlassCard>
                 )}

                 {/* STEP 2: Input Data */}
                 {activeStep === 2 && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                         <div className="lg:col-span-2">
                             <GlassCard className="relative overflow-hidden p-6 h-full flex flex-col rounded-[1.75rem] border border-[#F3F3F3] bg-gradient-to-br from-[#FBFBFB] via-[#F1F1F1] to-[#E9E9E9] shadow-[12px_12px_26px_rgba(177,177,177,0.3),-8px_-8px_20px_rgba(255,255,255,0.95),inset_2px_2px_1px_rgba(255,255,255,0.92),inset_-3px_-4px_8px_rgba(180,180,180,0.22)]">
                                 <div className="pointer-events-none absolute -top-12 right-[-36px] h-40 w-40 rounded-full bg-white/70 blur-2xl" />
                                 <div className="flex justify-between items-center mb-4">
                                     <h3 className="font-bold text-[#272727] flex items-center gap-2 relative">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAC9A3] bg-gradient-to-br from-[#FFF0D5] to-[#E7BE8A] shadow-[4px_4px_10px_rgba(166,110,54,0.2),-3px_-3px_8px_rgba(255,245,225,0.75)]">
                                          <FileSpreadsheet className="w-4 h-4 text-[#7E5C4A]"/>
                                        </span>
                                        Paste Raw Data
                                    </h3>
                                    <button
                                      onClick={handleSampleData}
                                      className="text-xs px-3 py-1.5 rounded-lg border border-[#D4AA7D]/45 bg-[#F8E3C0]/75 text-[#7E5C4A] font-bold transition-colors hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                                    >
                                        Load Sample
                                    </button>
                                </div>
                                 <textarea
                                     value={rawData}
                                     onChange={handleRawInputChange}
                                     placeholder={`Paste form Excel (PO, SKU, QTY)\nExample:\nPO123  SKU001  100\nPO123  SKU002  50`}
                                     className="flex-1 w-full bg-[#FDF6E8]/80 border border-[#D4AA7D]/45 rounded-2xl p-4 font-mono text-sm text-[#272727] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.8),inset_-4px_-4px_8px_rgba(181,122,61,0.16)] focus:ring-2 focus:ring-[#EFD09E] outline-none resize-none min-h-[300px]"
                                />
                                <div className="mt-4 flex justify-between items-center">
                                    <button
                                      onClick={() => setActiveStep(1)}
                                      className="px-4 py-2 rounded-xl border border-[#D4AA7D]/45 bg-[#F8E3C0]/70 text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727] hover:border-[#272727] font-bold text-sm transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={handleGeneratePlan}
                                        disabled={!rawData || isProcessing}
                                        className="px-6 py-3 rounded-xl border border-[#D4AA7D]/45 bg-[#F8E3C0]/70 text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727] hover:border-[#272727] font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    >
                                         {isProcessing ? (
                                             <>Processing...</>
                                         ) : (
                                             <>Generate Plan <Play className="w-4 h-4 fill-current"/></>
                                         )}
                                    </button>
                                </div>
                             </GlassCard>
                         </div>
                         
                         <div className="space-y-6">
                             <GlassCard className="p-6 rounded-[1.5rem] border border-[#F3F3F3] bg-gradient-to-br from-[#FAFAFA] via-[#F2F2F2] to-[#EAEAEA] shadow-[10px_10px_22px_rgba(177,177,177,0.28),-8px_-8px_18px_rgba(255,255,255,0.9),inset_2px_2px_1px_rgba(255,255,255,0.92),inset_-3px_-4px_8px_rgba(180,180,180,0.2)]">
                                <h4 className="font-bold text-[#272727] mb-3">Selected Context</h4>
                                <div className="flex items-center justify-between bg-[#F8E3C0]/80 p-3 rounded-xl border border-[#D4AA7D]/40 mb-3 shadow-[inset_1px_1px_0_rgba(255,247,232,0.9)]">
                                    <span className="text-sm text-[#7E5C4A]">Customer</span>
                                    <span className="font-bold text-[#272727] text-lg">{selectedCustomer?.code}</span>
                                </div>
                                <div className="flex items-center justify-between bg-[#F8E3C0]/80 p-3 rounded-xl border border-[#D4AA7D]/40 shadow-[inset_1px_1px_0_rgba(255,247,232,0.9)]">
                                    <span className="text-sm text-[#7E5C4A]">Region</span>
                                    <span className="font-bold text-[#272727]">{selectedCustomer?.region}</span>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-6 rounded-[1.5rem] border border-[#F3F3F3] bg-gradient-to-br from-[#FAFAFA] via-[#F2F2F2] to-[#EAEAEA] shadow-[10px_10px_22px_rgba(177,177,177,0.28),-8px_-8px_18px_rgba(255,255,255,0.9),inset_2px_2px_1px_rgba(255,255,255,0.92),inset_-3px_-4px_8px_rgba(180,180,180,0.2)]">
                                <h4 className="font-bold text-[#272727] mb-4">Tips</h4>
                                <ul className="space-y-2 text-sm text-[#7E5C4A]">
                                    <li className="flex gap-2 rounded-lg border border-[#D4AA7D]/25 bg-[#F8EEDB]/55 px-3 py-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#9ACD32] shrink-0" />
                                        <span>Copy directly from Excel/Sheets</span>
                                    </li>
                                    <li className="flex gap-2 rounded-lg border border-[#D4AA7D]/25 bg-[#F8EEDB]/55 px-3 py-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#9ACD32] shrink-0" />
                                        <span>Ensure columns are PO, SKU, Qty</span>
                                    </li>
                                    <li className="flex gap-2 rounded-lg border border-[#D4AA7D]/25 bg-[#F8EEDB]/55 px-3 py-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#9ACD32] shrink-0" />
                                        <span>System auto-fetches specs</span>
                                    </li>
                                </ul>
                             </GlassCard>
                         </div>
                     </div>
                 )}

                 {/* STEP 3: Results */}
                 {activeStep === 3 && planSummary && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                         {/* Summary Cards */}
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <SummaryCard label="Total Pallets" value={planSummary.totalPallets} icon={Layers} color="sunset" />
                             <SummaryCard label="Total Boxes" value={planSummary.totalBoxes} icon={Box} color="raisin" />
                             <SummaryCard label="Wrap Items" value={planSummary.totalWarps} icon={Archive} color="buff" />
                             <SummaryCard label="Total Items" value={planSummary.totalItems} icon={Package} color="green" />
                         </div>
                         <AdjustmentToolbar
                           isEditMode={isEditMode}
                           canUndo={adjustmentRecords.length > 0}
                           canRedo={redoRecords.length > 0}
                           hasUnsavedChanges={adjustmentRecords.length > 0}
                           onEnterEditMode={handleEnterEditMode}
                           onExitEditMode={handleExitEditMode}
                           onUndo={handleUndo}
                           onRedo={handleRedo}
                           onDiscard={handleDiscardChanges}
                         />

                         <div className="flex justify-center">
                            <div className="flex items-center gap-3">
                              <div className="group h-12 px-4 rounded-xl border border-[#E6E6E6] bg-gradient-to-br from-[#FFFFFF] via-[#F5F5F5] to-[#EBEBEB] text-[#4F4B64] font-bold shadow-[8px_8px_16px_rgba(160,160,160,0.25),-6px_-6px_14px_rgba(255,255,255,0.9)] flex items-center gap-2 transition-all hover:border-[#EFD09E] hover:bg-gradient-to-br hover:from-[#302E41] hover:via-[#272635] hover:to-[#1F1D2B] hover:text-[#EFD09E] hover:shadow-[10px_12px_20px_rgba(39,38,53,0.35)]">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#9ACD32]/30 text-[#272727] transition-colors group-hover:bg-[#3A374F] group-hover:text-[#EFD09E]">
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                                Accuracy Rate: <span className="ml-1 text-[#272635] tabular-nums group-hover:text-[#EFD09E]">{accuracyRateText}</span>
                              </div>
                              <button
                                onClick={() => setActiveStep(4)}
                                disabled={validationResult.errors.length > 0}
                                className={`${proceedToSaveButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                Proceed to Save <Play className="w-4 h-4 text-[#5a7a1a]" fill="#5a7a1a" />
                              </button>
                            </div>
                         </div>

                         {basePlanResult.length > 0 ? (
                           <div className="space-y-3">
                             <GlassCard className="p-4 rounded-xl border border-[#D4AA7D]/35 bg-[#EEF2F6]/80">
                               <p className="text-xs font-bold uppercase tracking-wider text-[#7E5C4A]">Validation Details</p>
                               <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                 <span className={`rounded-md border px-2 py-1 font-bold ${validationResult.errors.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#9ACD32]/40 bg-[#9ACD32]/20 text-[#5a7a1a]"}`}>
                                   {validationResult.errors.length} Errors
                                 </span>
                                 <span className={`rounded-md border px-2 py-1 font-bold ${validationResult.warnings.length > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-[#D4AA7D]/45 bg-[#EFD09E]/45 text-[#7E5C4A]"}`}>
                                   {validationResult.warnings.length} Warnings
                                 </span>
                                 <span className={`rounded-md border px-2 py-1 font-bold ${adjustmentRecords.length > 0 ? "border-[#D4AA7D]/45 bg-[#EFD09E]/55 text-[#7E5C4A]" : "border-[#D4AA7D]/35 bg-white/60 text-[#7E5C4A]/80"}`}>
                                   {adjustmentRecords.length > 0 ? `${adjustmentRecords.length} Unsaved adjustments` : "No unsaved adjustments"}
                                 </span>
                               </div>
                               {validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
                                 <p className="mt-2 text-xs font-bold text-[#5a7a1a]">No blocking issue found.</p>
                               ) : (
                                 <div className="mt-2 space-y-1 text-xs">
                                   {validationResult.errors.map((message, idx) => (
                                     <p key={`validation-error-${idx}`} className="text-rose-700">- {message}</p>
                                   ))}
                                   {validationResult.warnings.map((message, idx) => (
                                     <p key={`validation-warning-${idx}`} className="text-amber-700">- {message}</p>
                                   ))}
                                 </div>
                               )}
                             </GlassCard>
                           </div>
                         ) : null}

                         <div className="space-y-8">
                             {planResult.map((poGroup) => {
                               const poQty = poGroup.cases.reduce(
                                 (sum, c) => sum + c.items.reduce((itemSum, item) => itemSum + item.qty, 0),
                                 0
                               );
                               const selectedInPo = selectedCaseNosByPo(poGroup.po);

                               return (
                                 <div key={poGroup.po} className="overflow-hidden">
                                   <div className="bg-[#EEF2F6]/90 p-4 border-b border-[#D4AA7D]/30 flex flex-wrap gap-4 justify-between items-center backdrop-blur-sm rounded-t-2xl">
                                     <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-lg bg-[#272727] text-[#EFD09E] flex items-center justify-center font-bold shadow-sm">
                                         PO
                                       </div>
                                       <div>
                                         <h3 className="font-bold text-lg text-[#272727]">{poGroup.po}</h3>
                                         <p className="text-xs text-[#7E5C4A] font-medium">{poGroup.cases.length} Cases Generated</p>
                                       </div>
                                     </div>
                                       <div className="flex items-center gap-2">
                                         {isEditMode ? (
                                         <>
                                           <button
                                             onClick={() => openMergeCases(poGroup.po)}
                                             disabled={selectedInPo.length < 2}
                                             className="rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/60 px-3 py-2 text-xs font-bold text-[#7E5C4A] disabled:opacity-40"
                                           >
                                             Merge Selected ({selectedInPo.length})
                                           </button>
                                         </>
                                       ) : null}
                                       <div className="w-10 h-10 rounded-lg bg-[#272727] text-[#EFD09E] flex items-center justify-center font-bold shadow-sm text-[11px]">
                                         QTY
                                       </div>
                                       <div className="w-[72px] text-right">
                                         <h3 className="font-bold text-lg text-[#272727] tabular-nums">{poQty.toLocaleString()}</h3>
                                       </div>
                                     </div>
                                   </div>
                                   <div className="overflow-x-auto rounded-b-2xl shadow-[8px_8px_20px_rgba(166,180,200,0.30),-8px_-8px_20px_rgba(255,255,255,0.95)]">
                                     <table className="w-full text-sm text-left">
                                       {isEditMode ? (
                                         <colgroup>
                                           <col style={{ width: "5%" }} />
                                           <col style={{ width: "10%" }} />
                                           <col style={{ width: "14%" }} />
                                           <col style={{ width: "29%" }} />
                                           <col style={{ width: "14%" }} />
                                           <col style={{ width: "18%" }} />
                                           <col style={{ width: "10%" }} />
                                         </colgroup>
                                       ) : (
                                         <colgroup>
                                           <col style={{ width: "12%" }} />
                                           <col style={{ width: "16%" }} />
                                           <col style={{ width: "34%" }} />
                                           <col style={{ width: "16%" }} />
                                           <col style={{ width: "22%" }} />
                                         </colgroup>
                                       )}
                                       <thead className="bg-[#D4AA7D] text-xs font-black text-[#272727] uppercase tracking-wider">
                                         <tr>
                                           {isEditMode ? <th className="px-4 py-3 text-center w-10">Sel</th> : null}
                                           <th className="px-4 py-3 text-center">Case #</th>
                                           <th className="px-4 py-3 text-center">Type</th>
                                           <th className="px-4 py-3 text-center">Contents (SKU / Qty)</th>
                                           <th className="px-4 py-3 text-center">Dimensions</th>
                                           <th className="px-4 py-3 text-center">Note</th>
                                           {isEditMode ? <th className="px-4 py-3 text-center">Actions</th> : null}
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-[#D4AA7D]/30 bg-transparent">
                                         {poGroup.cases.map((c) => (
                                           <EditableCaseRow
                                             key={`${poGroup.po}-${c.caseNo}`}
                                             po={poGroup.po}
                                             caseData={c}
                                             skuDimensions={skuDimensions}
                                             isEditMode={isEditMode}
                                             packageOptions={availablePackages.map((pkg) => ({ name: pkg.name, category: pkg.category }))}
                                             selected={Boolean(selectedCaseKeys[caseKey(poGroup.po, c.caseNo)])}
                                             onToggleSelected={handleToggleCaseSelected}
                                             onUpdateQty={handleUpdateQty}
                                             onUpdateNote={handleUpdateNote}
                                             onChangePackage={handleChangePackage}
                                             onOpenSplit={openSplitCase}
                                           />
                                         ))}
                                       </tbody>
                                     </table>
                                   </div>
                                 </div>
                               );
                             })}
                         </div>

                         <div className="flex justify-center pt-8 gap-4">
                              <button 
                                  onClick={() => { setActiveStep(2); setPlanResult([]); setBasePlanResult([]); setIsHistoryMode(false); setIsEditMode(false); setAdjustmentRecords([]); setRedoRecords([]); setSelectedCaseKeys({}); setValidationResult({ errors: [], warnings: [] }); }}
                                  className="px-6 py-3 border-2 border-[#D4AA7D]/45 text-[#7E5C4A] font-bold rounded-xl hover:border-[#272727] hover:text-[#EFD09E] hover:bg-[#272727] transition-all flex items-center gap-2"
                              >
                                  <RotateCcw className="w-4 h-4"/> Back to Input
                              </button>
                              <button 
                                 onClick={() => setActiveStep(4)}
                                 disabled={validationResult.errors.length > 0}
                                 className={`${proceedToSaveButtonClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                 Proceed to Save <Play className="w-4 h-4 text-[#5a7a1a]" fill="#5a7a1a"/>
                             </button>
                         </div>
                     </div>
                 )}

                 {/* STEP 4: Save & Export */}
                 {activeStep === 4 && planSummary && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 max-w-2xl mx-auto text-center space-y-8">
                          <GlassCard className="p-12 flex flex-col items-center justify-center gap-6 bg-[#EEF2F6]/95 border border-white/80">
                              <div className="w-20 h-20 bg-[#9ACD32]/20 rounded-full flex items-center justify-center text-[#5a7a1a] mb-2">
                                  <CheckCircle2 className="w-10 h-10" />
                              </div>
                              <h2 className="text-3xl font-black text-[#272727]">Plan Ready!</h2>
                              <p className="text-[#7E5C4A] max-w-md">
                                  Your packing plan has been generated successfully. You can now download the PDF report or save this plan to the database.
                              </p>
                              {adjustmentRecords.length > 0 ? (
                                <p className="text-xs font-bold text-[#7E5C4A] bg-[#EFD09E]/50 border border-[#D4AA7D]/35 rounded-lg px-3 py-2">
                                  Manually adjusted: {adjustmentRecords.length} operations
                                </p>
                              ) : null}
                              {validationResult.errors.length > 0 ? (
                                <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                                  Save/Export blocked until validation errors are resolved.
                                </p>
                              ) : null}
                              
                              <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
                                  <button 
                                      onClick={handleSavePlan}
                                      disabled={isSaving || validationResult.errors.length > 0 || (isHistoryMode && adjustmentRecords.length === 0)}
                                      className={`flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 rounded-2xl transition-all group ${
                                          isSaving || validationResult.errors.length > 0 || (isHistoryMode && adjustmentRecords.length === 0) 
                                          ? 'border-[#D4AA7D]/40 opacity-50 cursor-not-allowed' 
                                          : 'border-[#D4AA7D]/35 hover:border-[#272727] hover:bg-[#272727] cursor-pointer'
                                      }`}
                                  >
                                      {isHistoryMode && adjustmentRecords.length === 0 ? (
                                          <>
                                            <CheckCircle2 className="w-8 h-8 text-[#9ACD32]"/>
                                            <span className="font-bold text-[#5a7a1a]">Saved to DB</span>
                                          </>
                                      ) : (
                                          <>
                                            <Save className={`w-8 h-8 text-[#7E5C4A] ${!isSaving && 'group-hover:text-[#EFD09E]'} transition-colors`}/>
                                            <span className={`font-bold text-[#7E5C4A] ${!isSaving && 'group-hover:text-[#EFD09E]'}`}>
                                                {isSaving ? 'Saving...' : 'Save to DB'}
                                            </span>
                                          </>
                                      )}
                                  </button>
                                  
                                  <button 
                                      onClick={handleDownload}
                                      disabled={isExportingPlan || validationResult.errors.length > 0}
                                      className="flex flex-col items-center justify-center gap-3 p-6 bg-[#EFD09E]/40 border-2 border-[#D4AA7D]/35 rounded-2xl hover:border-[#272727] hover:bg-[#272727] transition-all group"
                                  >
                                      <Download className="w-8 h-8 text-[#7E5C4A] group-hover:text-[#EFD09E] transition-colors"/>
                                      <span className="font-bold text-[#7E5C4A] group-hover:text-[#EFD09E]">
                                        {isExportingPlan ? "Preparing PDF..." : "Download Plan"}
                                      </span>
                                  </button>

                                  <button 
                                      onClick={handleExportPackingDetails}
                                      disabled={validationResult.errors.length > 0 || isExportingPackingDetails || isLoadingShipmentOptions || totalNoCount === 0}
                                      className="flex flex-col items-center justify-center gap-3 p-6 bg-[#EFD09E]/40 border-2 border-[#D4AA7D]/35 rounded-2xl hover:border-[#272727] hover:bg-[#272727] transition-all group "
                                  >
                                      <FileText className="w-8 h-8 text-[#7E5C4A] group-hover:text-[#EFD09E] transition-colors"/>
                                      <span className="font-bold text-[#7E5C4A] group-hover:text-[#EFD09E]">
                                        {isLoadingShipmentOptions ? "Loading Shipment..." : isExportingPackingDetails ? "Preparing..." : "Download Packing Details"}
                                      </span>
                                  </button>
                                  
                              </div>
                          </GlassCard>

                           <div className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
                             <button
                               onClick={() => setActiveStep(3)}
                               className="px-8 py-3 bg-[#EEF2F6] text-[#5A3F2C] font-bold rounded-xl border border-[#D4AA7D]/45 hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] transition-all flex items-center justify-center gap-2 flex-1"
                             >
                               <RotateCcw className="w-4 h-4" /> Back to Review Plan
                             </button>
                             <button 
                                 onClick={() => { setActiveStep(1); setPlanResult([]); setBasePlanResult([]); setPlanSummary(null); setIsHistoryMode(false); setIsEditMode(false); setAdjustmentRecords([]); setRedoRecords([]); setSelectedCaseKeys({}); setValidationResult({ errors: [], warnings: [] }); }}
                                 className="px-8 py-3 bg-[#272727] text-[#EFD09E] font-bold rounded-xl hover:bg-[#3A374F] shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 transition-all flex items-center justify-center gap-2 flex-1"
                             >
                                 <RotateCcw className="w-4 h-4"/> Start New Plan
                             </button>
                           </div>
                     </div>
                 )}
             </div>
          </ModuleHeader>

        </div>
      </section>

      {isPackingDetailsDialogOpen ? (
        <PackingDetailsExportDialog
          open={isPackingDetailsDialogOpen}
          poSummaries={poSummaries}
          shipmentOptions={shipmentOptions}
          defaultShipment={selectedCustomer?.code}
          isSubmitting={isExportingPackingDetails}
          onClose={() => setIsPackingDetailsDialogOpen(false)}
          onSubmit={handleConfirmExportPackingDetails}
        />
      ) : null}

      {/* Split Case Modal */}
      {splitDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm"
        >
          <div
            className="bg-[#EEF2F6]/95 border border-white/80 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-[#272727]">Split Case #{splitDraft.caseNo}</h4>
            <p className="text-sm text-[#7E5C4A] mt-1">PO {splitDraft.po}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#7E5C4A] mb-1">SKU</label>
                <select
                  value={splitDraft.sku}
                  onChange={(e) => {
                    const nextSku = e.target.value;
                    const sourceCase = getCase(splitDraft.po, splitDraft.caseNo);
                    const nextItem = sourceCase?.items.find((item) => item.sku === nextSku);
                    const currentQty = Number(splitQtyInput);
                    const maxQty = nextItem?.qty || 1;
                    const normalizedQty = Number.isFinite(currentQty) && currentQty > 0
                      ? Math.min(Math.floor(currentQty), maxQty)
                      : Math.max(1, Math.floor(maxQty / 2));

                    setSplitDraft((prev) => (prev ? { ...prev, sku: nextSku, qty: normalizedQty } : prev));
                    setSplitQtyInput(String(normalizedQty));
                  }}
                  className="w-full rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/45 px-3 py-2 text-sm text-[#272727]"
                >
                  {(getCase(splitDraft.po, splitDraft.caseNo)?.items || []).map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {item.sku} (qty {item.qty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Split Qty</label>
                <input
                  type="text"
                  inputMode="numeric"
                  min={1}
                  max={getCase(splitDraft.po, splitDraft.caseNo)?.items.find((item) => item.sku === splitDraft.sku)?.qty || 1}
                  value={splitQtyInput}
                  onFocus={(e) => {
                    if (e.target.value === "0") setSplitQtyInput("");
                  }}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^\d]/g, "");
                    setSplitQtyInput(digitsOnly);
                  }}
                  onBlur={() => {
                    const selectedItemQty =
                      getCase(splitDraft.po, splitDraft.caseNo)?.items.find((item) => item.sku === splitDraft.sku)?.qty || 1;
                    const parsed = Number(splitQtyInput);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      setSplitQtyInput("1");
                      return;
                    }
                    const normalized = Math.min(Math.floor(parsed), selectedItemQty);
                    setSplitQtyInput(String(normalized));
                  }}
                  className="w-full rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/45 px-3 py-2 text-sm text-[#272727]"
                />
                <p className="mt-1 text-[11px] text-[#7E5C4A]/80">
                  Max for selected SKU:{" "}
                  {getCase(splitDraft.po, splitDraft.caseNo)?.items.find((item) => item.sku === splitDraft.sku)?.qty || 0}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Target Package</label>
                <select
                  value={splitDraft.packageName}
                  onChange={(e) => setSplitDraft((prev) => (prev ? { ...prev, packageName: e.target.value } : prev))}
                  className="w-full rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/45 px-3 py-2 text-sm text-[#272727]"
                >
                  {availablePackages.map((pkg) => (
                    <option key={pkg.name} value={pkg.name}>
                      {pkg.name} ({pkg.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setSplitDraft(null);
                  setSplitQtyInput("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#7E5C4A] font-bold hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
              >
                Cancel
              </button>
              <button
                onClick={confirmSplitCase}
                className="flex-1 py-2.5 rounded-xl border border-[#7E5C4A]/35 bg-[#272727] text-[#EFD09E] font-bold hover:bg-[#3A374F]"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Cases Modal */}
      {mergeDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm"
          onClick={() => setMergeDraft(null)}
        >
          <div
            className="bg-[#EEF2F6]/95 border border-white/80 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-bold text-[#272727]">Merge Cases</h4>
            <p className="text-sm text-[#7E5C4A] mt-1">
              PO {mergeDraft.po} | Cases {mergeDraft.caseNos.join(", ")}
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#7E5C4A] mb-1">Target Package</label>
              <select
                value={mergeDraft.packageName}
                onChange={(e) => setMergeDraft((prev) => (prev ? { ...prev, packageName: e.target.value } : prev))}
                className="w-full rounded-lg border border-[#D4AA7D]/45 bg-[#EFD09E]/45 px-3 py-2 text-sm text-[#272727]"
              >
                {availablePackages.map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name} ({pkg.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setMergeDraft(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#7E5C4A] font-bold hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
              >
                Cancel
              </button>
              <button
                onClick={confirmMergeCases}
                className="flex-1 py-2.5 rounded-xl border border-[#7E5C4A]/35 bg-[#272727] text-[#EFD09E] font-bold hover:bg-[#3A374F]"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Management Modal */}
      {isCustomerFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/50 backdrop-blur-sm animate-fade-in"
          onClick={closeCustomerForm}
        >
          <div
            className="bg-[#EEF2F6]/95 border border-white/80 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#D4AA7D]/25 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#9ACD32] text-[#272727] rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#272727]">Manage Customers</h3>
                  <p className="text-sm text-[#7E5C4A]">Add or edit customer codes and their region types.</p>
                </div>
              </div>
              <button
                onClick={closeCustomerForm}
                className="p-2 text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727] rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 min-h-0">
              <div className="overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#D4AA7D] text-xs font-black text-[#272727] uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3 text-center">Region Type</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AA7D]/30 bg-transparent">
                    {Object.keys(customerPackTypeMapping).sort().map((code) => (
                      <tr key={code} className="hover:bg-[#272727] group transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-bold text-[#272727] group-hover:text-[#EFD09E]">{code}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${
                            customerPackTypeMapping[code] === "A" ? "bg-[#9ACD32]/20 text-[#5a7a1a] group-hover:bg-[#EFD09E]/20 group-hover:text-[#EFD09E]" :
                            customerPackTypeMapping[code] === "E" ? "bg-[#272727]/10 text-[#272727] group-hover:bg-[#EFD09E]/20 group-hover:text-[#EFD09E]" :
                            "bg-[#D4AA7D]/30 text-[#7E5C4A] group-hover:bg-[#EFD09E]/20 group-hover:text-[#EFD09E]"
                          }`}>
                            {customerPackTypeMapping[code]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openCustomerForm(code)}
                            className="text-[#7E5C4A] font-bold hover:underline text-xs"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-l border-[#D4AA7D]/25 p-5 bg-[#F5E7CC]/45 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-[#272727]">
                    {editingCustomerCode ? "Edit Customer" : "New Customer"}
                  </h4>
                  <button
                    onClick={() => {
                      setEditingCustomerCode(null);
                      setCustomerForm({ code: "", type: "E" });
                    }}
                    className="text-xs font-bold px-2 py-1 rounded border border-[#D4AA7D]/40 text-[#7E5C4A] hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Customer Code</label>
                    <input
                      type="text"
                      value={customerForm.code}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-[#D4AA7D]/40 bg-[#EFD09E]/45 rounded-xl text-[#272727] outline-none focus:ring-2 focus:ring-[#9ACD32]/30"
                      placeholder="e.g. FAP"
                      disabled={!!editingCustomerCode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#7E5C4A] mb-1">Region Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["A", "E", "R"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setCustomerForm((prev) => ({ ...prev, type }))}
                          className={`py-2 rounded-lg font-bold border transition-all ${
                            customerForm.type === type
                              ? "bg-[#272727] text-[#EFD09E] border-[#272727]"
                              : "bg-[#EFD09E]/45 text-[#7E5C4A] border-[#D4AA7D]/35 hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 flex gap-3">
                    {editingCustomerCode && (
                      <button
                        onClick={() => deleteCustomer(editingCustomerCode)}
                        className="p-3 text-red-500 hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E] rounded-xl border border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={saveCustomer}
                      className="flex-1 py-3 bg-[#272727] text-[#EFD09E] font-bold rounded-xl hover:bg-[#3A374F] shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Customer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {pendingDeleteCustomerCode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#272727]/45 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPendingDeleteCustomerCode(null)}
        >
          <div
            className="bg-[#EEF2F6]/95 border border-white/80 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#D4AA7D]/35 text-[#7E5C4A] rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-[#272727]">Confirm Delete</h4>
            </div>
            <p className="text-sm text-[#7E5C4A]">
              Delete customer <span className="font-bold text-[#272727]">{pendingDeleteCustomerCode}</span>?
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setPendingDeleteCustomerCode(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#D4AA7D]/40 bg-[#EFD09E]/45 text-[#7E5C4A] font-bold hover:bg-[#272727] hover:border-[#272727] hover:text-[#EFD09E]"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteCustomer(pendingDeleteCustomerCode)}
                className="flex-1 py-2.5 rounded-xl border border-[#7E5C4A]/35 bg-[#272727] text-[#EFD09E] font-bold hover:bg-[#3A374F]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#272727]/30 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-[#EEF2F6]/95 border border-white/80 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="w-16 h-16 bg-[#9ACD32]/20 rounded-full flex items-center justify-center mx-auto text-[#5a7a1a]">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <div>
                <h3 className="text-xl font-bold text-[#272727]">Saved Successfully!</h3>
                <p className="text-[#7E5C4A] text-sm mt-2">
                   The packing plan has been saved to the database.
                </p>
             </div>
             
             <button 
                onClick={handleDownload}
                disabled={isExportingPlan}
                className="w-full py-3 bg-[#272727] text-[#EFD09E] font-bold rounded-xl hover:bg-[#3A374F] shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20 transition-all flex items-center justify-center gap-2"
             >
                <Download className="w-5 h-5"/> {isExportingPlan ? "Preparing PDF..." : "Download PDF"}
             </button>

             <button 
                onClick={() => setShowSuccessModal(false)}
                className="text-[#7E5C4A] hover:text-[#EFD09E] hover:bg-[#272727] rounded-md px-2 py-1 text-sm font-bold transition-colors"
             >
                Close
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

interface SummaryCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: 'sunset' | 'raisin' | 'buff' | 'green';
}

function SummaryCard({ label, value, icon: Icon, color }: SummaryCardProps) {
    void color;

    return (
        <GlassCard className="p-4 flex items-center gap-4 rounded-[1.25rem] border border-[#EFEFEF] bg-gradient-to-br from-[#FFFFFF] via-[#F5F5F5] to-[#ECECEC] shadow-[8px_8px_18px_rgba(160,160,160,0.22),-7px_-7px_16px_rgba(255,255,255,0.92),inset_2px_2px_1px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(177,177,177,0.2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_36px_rgba(39,39,39,0.2)] hover:bg-gradient-to-br hover:from-[#FFFFFF] hover:to-[#EDEDED] group">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#9ACD32] border border-[#7FAA2B]/45 text-[#272727] shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:bg-[#272635] group-hover:border-[#272635]/80 group-hover:text-[#EFD09E]">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs font-bold text-[#7E5C4A] uppercase tracking-wider transition-colors group-hover:text-[#6B4D3A]">{label}</p>
                <p className="text-2xl font-black text-[#272727] transition-colors group-hover:text-[#1F1D2B]">{value}</p>
            </div>
        </GlassCard>
    );
}
