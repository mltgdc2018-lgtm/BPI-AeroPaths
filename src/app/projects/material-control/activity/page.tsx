"use client";

import { useState, useEffect } from "react";
import { ModuleHeader } from "@/components/projects/material-control/ModuleHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { Modal } from "@/components/shared/Modal";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Clock, CalendarDays, TrendingUp, Download, Plus, Edit, Trash2, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { ActivityService, ActivityLog } from "@/lib/firebase/services/activity.service";

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [filterYear, setFilterYear] = useState("All");
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data } = await ActivityService.getRecent(200);
      // Ensure all timestamps are Date objects for easier handling
      const normalized = data.map(a => {
        let d: Date;
        if (a.timestamp instanceof Date) {
          d = a.timestamp;
        } else if (a.timestamp && typeof (a.timestamp as any).toDate === 'function') { // eslint-disable-line @typescript-eslint/no-explicit-any
          d = (a.timestamp as any).toDate(); // eslint-disable-line @typescript-eslint/no-explicit-any
        } else {
          d = new Date(a.timestamp as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
        return { ...a, timestamp: d };
      });
      setActivities(normalized as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    fetchActivities();
  }, []);

  // Action icon and color mapping
  const getActionStyle = (action: string) => {
    switch (action) {
      case "Create":
        return { icon: <Plus className="w-3 h-3" />, color: "bg-[#9ACD32]/20 text-[#5a7a1a] border-[#9ACD32]/35" };
      case "Update":
        return { icon: <Edit className="w-3 h-3" />, color: "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30" };
      case "Delete":
        return { icon: <Trash2 className="w-3 h-3" />, color: "bg-rose-50 text-rose-700 border-rose-100" };
      case "Export":
        return { icon: <FileText className="w-3 h-3" />, color: "bg-[#EFD09E]/60 text-[#7E5C4A] border-[#D4AA7D]/35" };
      default:
        return { icon: null, color: "bg-[#EEF2F6] text-[#7E5C4A] border-[#D4AA7D]/30" };
    }
  };

  // Table Columns
  const columns: Column<ActivityLog>[] = [
    { 
      key: "timestamp", 
      header: "Date/Time", 
      type: "date",
      render: (val) => {
        const date = val as Date;
        return (
          <div>
            <p className="font-medium">{formatDate(date)}</p>
            <p className="text-xs text-[#7E5C4A]/70">{date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        );
      }
    },
    { 
      key: "action", 
      header: "Action", 
      align: "center",
      render: (val) => {
        const action = typeof val === "string" ? val : String(val ?? "");
        const style = getActionStyle(action);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.color}`}>
            {style.icon} {action || "-"}
          </span>
        );
      }
    },
    { 
      key: "module", 
      header: "Module", 
      align: "center",
      render: (val) => {
        const module = typeof val === "string" ? val : String(val ?? "-");
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#EFD09E]/70 text-[#272727] border border-[#D4AA7D]/35">
            {module}
          </span>
        );
      }
    },
    { key: "targetName", header: "Target" },
    { key: "user", header: "User", align: "center" },
  ];

  // Filter data
  const filteredData = activities.filter((activity) => {
    const activityDate = activity.timestamp as unknown as Date;
    const matchesSearch = 
      activity.targetName?.toLowerCase().includes(searchValue.toLowerCase()) ||
      activity.module?.toLowerCase().includes(searchValue.toLowerCase()) ||
      activity.action?.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesYear = filterYear === "All" || activityDate.getFullYear().toString() === filterYear;
    return matchesSearch && matchesYear;
  });

  // Stats calculation
  const now = new Date();
  const today = now.toDateString();
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);

  const todayCount = activities.filter(a => (a.timestamp as unknown as Date).toDateString() === today).length;
  const weekCount = activities.filter(a => (a.timestamp as unknown as Date) >= thisWeekStart).length;
  const monthCount = activities.filter(a => (a.timestamp as unknown as Date) >= thisMonthStart).length;

  return (
    <div className="min-h-screen pt-20 bg-[#F6EDDE] relative overflow-hidden">
      <div className="absolute top-24 -left-16 w-72 h-72 bg-[#D4AA7D]/15 rounded-full blur-3xl" />
      <div className="absolute bottom-16 -right-16 w-80 h-80 bg-[#EFD09E]/25 rounded-full blur-3xl" />
      <section className="py-12 md:py-16">
        <div className="container-custom relative z-10">
          <ModuleHeader
            title="Activity Log"
            description="ประวัติการทำงานทั้งหมด - การเพิ่ม แก้ไข ลบ และส่งออกข้อมูล"
          >
            <div className="space-y-6 mt-8">
              {/* Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">Today</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{todayCount}</h3>
                    <p className="text-xs text-[#7E5C4A]/70 mt-1 group-hover:text-[#EFD09E]/60">activities</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <Clock className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">This Week</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{weekCount}</h3>
                    <p className="text-xs text-emerald-600 mt-1 font-medium">Last 7 days</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <CalendarDays className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center justify-between bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.28),-8px_-8px_18px_rgba(255,255,255,0.92)] hover:bg-[#272727] group transition-all duration-300">
                  <div>
                    <p className="text-[#7E5C4A] text-sm font-medium group-hover:text-[#EFD09E]/80">This Month</p>
                    <h3 className="text-2xl font-bold text-[#272727] mt-1 group-hover:text-[#EFD09E]">{monthCount}</h3>
                    <p className="text-xs text-blue-500 mt-1 font-medium">All activities</p>
                  </div>
                  <div className="p-3 bg-[#9ACD32] rounded-xl border border-[#EFD09E]/50">
                    <TrendingUp className="w-6 h-6 text-[#272727]" />
                  </div>
                </GlassCard>
              </div>

              {/* Search Toolbar */}
              <SearchToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                searchPlaceholder="Search activities..."
                filterValue={filterYear}
                onFilterChange={setFilterYear}
                primaryButton={{
                  label: "Export Log",
                  icon: <Download className="w-4 h-4" />,
                  onClick: () => console.log("Export activities"),
                }}
              />

              {/* Data Table */}
              <DataTable
                columns={columns}
                data={filteredData}
                keyField="id"
                onRowClick={(row) => setSelectedActivity(row)}
                emptyMessage="No activities found"
              />
            </div>
          </ModuleHeader>

          {/* Activity Details Modal */}
          <Modal
            isOpen={!!selectedActivity}
            onClose={() => setSelectedActivity(null)}
            title={`Activity Details`}
            className="md:max-w-lg"
          >
            {selectedActivity && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex justify-between items-start bg-[#EEF2F6]/80 p-4 rounded-lg border border-white/80">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Action</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium border ${getActionStyle(selectedActivity.action).color}`}>
                      {getActionStyle(selectedActivity.action).icon} {selectedActivity.action}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Date/Time</p>
                    <p className="font-semibold text-[#272727]">{formatDate(selectedActivity.timestamp as any)}</p> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                    <p className="text-xs text-[#7E5C4A]/70">{new Date(selectedActivity.timestamp as any).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">Module</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-sm font-medium bg-[#EFD09E]/70 text-[#272727] border border-[#D4AA7D]/35">
                      {selectedActivity.module}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-1">User</p>
                    <p className="font-medium text-[#272727]">{selectedActivity.user}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[#7E5C4A] uppercase mb-1">Target</p>
                  <p className="font-medium text-[#272727]">{selectedActivity.targetName}</p>
                  <p className="text-xs text-[#7E5C4A]/70">ID: {selectedActivity.targetId}</p>
                </div>

                {/* Changes (for Update action) */}
                {selectedActivity.changes && selectedActivity.changes.length > 0 && (
                  <div>
                    <p className="text-xs text-[#7E5C4A] uppercase mb-2">Changes</p>
                    <div className="bg-[#EEF2F6]/70 rounded-xl border border-white/80 overflow-hidden shadow-[6px_6px_14px_rgba(166,180,200,0.28),-6px_-6px_14px_rgba(255,255,255,0.92)]">
                      <table className="w-full text-sm">
                        <thead className="bg-[#D4AA7D]">
                          <tr>
                            <th className="px-3 py-2 text-left font-black text-[#272727] uppercase text-xs tracking-wider">Field</th>
                            <th className="px-3 py-2 text-left font-black text-[#272727] uppercase text-xs tracking-wider">Before</th>
                            <th className="px-3 py-2 text-left font-black text-[#272727] uppercase text-xs tracking-wider">After</th>
                          </tr>
                        </thead>
                        <tbody className="bg-transparent">
                          {selectedActivity.changes?.map((change: any, idx: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                            <tr key={idx} className="border-t border-[#D4AA7D]/20 hover:bg-[#272727] group transition-colors">
                              <td className="px-3 py-2 font-medium text-[#272727] group-hover:text-[#EFD09E]">{change.field}</td>
                              <td className="px-3 py-2 text-rose-500 line-through group-hover:text-rose-400">{change.before}</td>
                              <td className="px-3 py-2 text-[#5a7a1a] font-medium group-hover:text-[#9ACD32]">{change.after}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-[#D4AA7D]/25">
                  <button 
                    onClick={() => setSelectedActivity(null)}
                    className="w-full py-2.5 bg-[#272727] hover:bg-[#1f1f1f] text-[#EFD09E] rounded-lg font-medium transition-colors shadow-lg shadow-[#272727]/25 border border-[#EFD09E]/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </section>
    </div>
  );
}
