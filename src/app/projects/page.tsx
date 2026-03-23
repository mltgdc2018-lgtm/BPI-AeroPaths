import {
  Package,
  Warehouse,
  Truck,
  FileText,
  ListTodo,
  BarChart3,
  Wrench,
  Users,
  Boxes,
} from "lucide-react";

import { ProjectCard } from "@/components/shared/ProjectCard";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen pt-20">
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="bg-clip-text text-transparent bg-linear-to-br from-slate-800 via-slate-600 to-slate-800 bg-size-[200%_100%] animate-shimmer drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                Projects
              </span>
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
              Select a module to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ProjectCard
              title="Material Control"
              description="Manage inventory, requisitions, and receiving. Track stock levels and automate reorder points."
              icon={Package}
              href="/projects/material-control"
              status="active"
              iconColor="from-blue-500 to-blue-600"
            />

            <ProjectCard
              title="Packaging Console"
              description="Automated packaging planning and optimization system for efficient logistics and material handling."
              icon={Boxes}
              href="/projects/packaging"
              status="active"
              iconColor="from-emerald-500 to-emerald-600"
            />

            <ProjectCard
              title="Warehouse Management"
              description="Optimize warehouse operations with location tracking, stock movements, and space utilization."
              icon={Warehouse}
              href="/projects/warehouse"
              status="coming-soon"
              iconColor="from-purple-500 to-purple-600"
            />

            <ProjectCard
              title="Delivery Tracking"
              description="Monitor shipments, delivery status, and logistics in real-time with automated notifications."
              icon={Truck}
              href="/projects/delivery"
              status="coming-soon"
              iconColor="from-green-500 to-green-600"
            />

            <ProjectCard
              title="Document Center"
              description="Centralized repository for all documents, reports, and compliance records."
              icon={FileText}
              href="/projects/documents"
              status="coming-soon"
              iconColor="from-amber-500 to-amber-600"
            />

            <ProjectCard
              title="Task Management"
              description="Assign, track, and manage team tasks with priorities and deadlines."
              icon={ListTodo}
              href="/projects/tasks"
              status="coming-soon"
              iconColor="from-cyan-500 to-cyan-600"
            />

            <ProjectCard
              title="Analytics Dashboard"
              description="Comprehensive reports and insights on inventory, operations, and team performance."
              icon={BarChart3}
              href="/projects/analytics"
              status="coming-soon"
              iconColor="from-pink-500 to-pink-600"
            />

            <ProjectCard
              title="Maintenance Log"
              description="Track equipment maintenance, repairs, and service schedules."
              icon={Wrench}
              href="/projects/maintenance"
              status="coming-soon"
              iconColor="from-red-500 to-red-600"
            />

            <ProjectCard
              title="Staff Schedule"
              description="Manage team schedules, shifts, and availability for optimal coverage."
              icon={Users}
              href="/projects/staff"
              status="coming-soon"
              iconColor="from-indigo-500 to-indigo-600"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
