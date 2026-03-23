// นำเข้าเครื่องมือของ React และ Next.js
import React from 'react';

// สร้างฟังก์ชัน (Component) สำหรับหน้าเว็บนี้
export default function InventoryPage() {
  
  // จำลองข้อมูลสินค้า (JavaScript Array)
  const materials = [
    { id: 'M001', name: 'กล่องกระดาษลูกฟูก', qty: 500, status: 'พร้อมใช้' },
    { id: 'M002', name: 'พลาสติกกันกระแทก (Bubble)', qty: 50, status: 'ใกล้หมด' },
    { id: 'M003', name: 'เทปกาวใส', qty: 120, status: 'พร้อมใช้' }
  ];

  // ส่วนของการแสดงผล (เขียน HTML ผสม JavaScript)
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ระบบจัดการคลังสินค้า (Material Inventory)</h1>
      
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">รหัสสินค้า</th>
            <th className="border p-2">ชื่อรายการ</th>
            <th className="border p-2">จำนวนคงเหลือ</th>
            <th className="border p-2">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {/* ใช้ JavaScript (.map) ในการดึงข้อมูลมาแสดงทีละบรรทัด */}
          {materials.map((item) => (
            <tr key={item.id} className="text-center">
              <td className="border p-2">{item.id}</td>
              <td className="border p-2 text-left">{item.name}</td>
              <td className="border p-2">{item.qty}</td>
              <td className={`border p-2 font-bold ${item.status === 'ใกล้หมด' ? 'text-red-500' : 'text-green-500'}`}>
                {item.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
