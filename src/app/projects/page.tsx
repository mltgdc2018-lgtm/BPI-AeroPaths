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
                โครงการ / โมดูลใช้งาน
              </span>
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
              เลือกโมดูลที่ต้องการเพื่อดำเนินการต่อ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ProjectCard
              title="ระบบควบคุมวัสดุ (Material Control)"
              description="จัดการสต็อกสินค้า, ใบเบิก และการรับของ ติดตามระดับสินค้าคงคลังและระบบแจ้งเตือนจุดสั่งซื้ออัตโนมัติ"
              icon={Package}
              href="/projects/material-control"
              status="active"
              iconColor="from-blue-500 to-blue-600"
            />

            <ProjectCard
              title="ระบบวางแผนบรรจุภัณฑ์ (Packaging Console)"
              description="ระบบวางแผนและเพิ่มประสิทธิภาพการบรรจุภัณฑ์อัตโนมัติ เพื่อการจัดการลอจิสติกส์และวัสดุที่รวดเร็ว"
              icon={Boxes}
              href="/projects/packaging"
              status="active"
              iconColor="from-emerald-500 to-emerald-600"
            />

            <ProjectCard
              title="ระบบจัดการคลังสินค้า (Warehouse)"
              description="เพิ่มประสิทธิภาพพื้นที่คลังสินค้าด้วยการติดตามตำแหน่ง การเคลื่อนไหวของสต็อก และการใช้พื้นที่"
              icon={Warehouse}
              href="/projects/warehouse"
              status="coming-soon"
              iconColor="from-purple-500 to-purple-600"
            />

            <ProjectCard
              title="ระบบติดตามการจัดส่ง (Delivery)"
              description="ตรวจสอบสถานะการขนส่ง และลอจิสติกส์แบบเรียลไทม์ พร้อมระบบแจ้งเตือนอัตโนมัติ"
              icon={Truck}
              href="/projects/delivery"
              status="coming-soon"
              iconColor="from-green-500 to-green-600"
            />

            <ProjectCard
              title="ศูนย์รวมเอกสาร (Documents)"
              description="แหล่งรวบรวมเอกสาร รายงาน และบันทึกการปฏิบัติตามข้อกำหนดทั้งหมดขององค์กร"
              icon={FileText}
              href="/projects/documents"
              status="coming-soon"
              iconColor="from-amber-500 to-amber-600"
            />

            <ProjectCard
              title="ระบบจัดการงาน (Tasks)"
              description="มอบหมาย ติดตาม และจัดการงานของทีม พร้อมระบบจัดลำดับความสำคัญและกำหนดส่ง"
              icon={ListTodo}
              href="/projects/tasks"
              status="coming-soon"
              iconColor="from-cyan-500 to-cyan-600"
            />

            <ProjectCard
              title="แดชบอร์ดสถิติ (Analytics)"
              description="รายงานสรุปและข้อมูลเชิงลึกเกี่ยวกับคลังสินค้า การดำเนินงาน และประสิทธิภาพของทีม"
              icon={BarChart3}
              href="/projects/analytics"
              status="coming-soon"
              iconColor="from-pink-500 to-pink-600"
            />

            <ProjectCard
              title="บันทึกการบำรุงรักษา (Maintenance)"
              description="ติดตามการบำรุงรักษาอุปกรณ์ การซ่อมแซม และตารางการเข้ารับบริการตามระยะเวลา"
              icon={Wrench}
              href="/projects/maintenance"
              status="coming-soon"
              iconColor="from-red-500 to-red-600"
            />

            <ProjectCard
              title="ตารางเวลาเจ้าหน้าที่ (Staff Schedule)"
              description="จัดการตารางเวลา การเข้ากะ และความพร้อมของทีมงานเพื่อการปฏิบัติงานที่ครอบคลุม"
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
