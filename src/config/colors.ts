/**
 * สีหลักของระบบ BPI AeroPath
 * Main color palette for BPI AeroPath system
 */

// ชุดสีหลัก (Main Color Palette)
export const COLORS = {
  // Raisin black - สีดำอมเทา
  RAISIN_BLACK: {
    bg: '#272727',
    font: '#efd09e',
    name: 'Raisin Black'
  },
  
  // Buff - สีกาแฟอมเหลือง
  BUFF: {
    bg: '#7e5c4a',
    font: '#efd09e',
    name: 'Buff'
  },
  
  // Sunset - สีพระอาทิตย์ตก
  SUNSET: {
    bg: '#d4aa7d',
    font: '#272727',
    name: 'Sunset'
  },
  
  // Creamy - สีครีม
  CREAMY: {
    bg: '#efd09e',
    font: '#272727',
    name: 'Creamy'
  },
  
  // พื้นหลังหน้าเพจ (Page Background)
  PAGE_BG: {
    bg: '#f6edde',
    name: 'Page Background'
  },
  
  // ไอคอนและโฟกัส (Icon & Focus)
  ICON_FOCUS: {
    bg: '#9acd32',
    name: 'Icon Focus'
  }
} as const;

// สีสำหรับ UI Components
export const UI_COLORS = {
  // ปุ่มหลัก (Primary Button)
  PRIMARY_BUTTON: {
    normal: COLORS.BUFF,
    hover: COLORS.RAISIN_BLACK,
    focus: COLORS.RAISIN_BLACK
  },
  
  // ปุ่มรอง (Secondary Button)
  SECONDARY_BUTTON: {
    normal: {
      bg: 'transparent',
      font: COLORS.BUFF.bg,
      border: COLORS.BUFF.bg
    },
    hover: COLORS.SUNSET,
    focus: COLORS.SUNSET
  },
  
  // การ์ด (Card)
  CARD: {
    normal: {
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.2)'
    },
    hover: {
      bg: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(255, 255, 255, 0.3)'
    }
  },
  
  // ข้อความ (Text)
  TEXT: {
    primary: COLORS.RAISIN_BLACK.bg,
    secondary: COLORS.BUFF.bg,
    accent: COLORS.ICON_FOCUS.bg,
    muted: '#666666'
  },
  
  // สถานะ (Status)
  STATUS: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
} as const;

// Tailwind CSS Custom Colors
export const TAILWIND_COLORS = {
  // สีหลัก
  'raisin-black': COLORS.RAISIN_BLACK.bg,
  'buff': COLORS.BUFF.bg,
  'sunset': COLORS.SUNSET.bg,
  'creamy': COLORS.CREAMY.bg,
  'page-bg': COLORS.PAGE_BG.bg,
  'icon-focus': COLORS.ICON_FOCUS.bg,
  
  // สีข้อความ
  'text-primary': UI_COLORS.TEXT.primary,
  'text-secondary': UI_COLORS.TEXT.secondary,
  'text-accent': UI_COLORS.TEXT.accent,
  'text-muted': UI_COLORS.TEXT.muted,
  
  // สีสถานะ
  'status-success': UI_COLORS.STATUS.success,
  'status-warning': UI_COLORS.STATUS.warning,
  'status-error': UI_COLORS.STATUS.error,
  'status-info': UI_COLORS.STATUS.info
} as const;

// ฟังก์ชันช่วยสำหรับใช้งานสี
export const getColor = (colorKey: keyof typeof COLORS) => COLORS[colorKey];
export const getUIColor = (colorKey: keyof typeof UI_COLORS) => UI_COLORS[colorKey];
export const getTailwindColor = (colorKey: keyof typeof TAILWIND_COLORS) => TAILWIND_COLORS[colorKey];

// ตัวอย่างการใช้งาน:
// import { COLORS, UI_COLORS, getColor } from '@/config/colors'
// const primaryColor = getColor('BUFF')
// const buttonColors = getUIColor('PRIMARY_BUTTON')
