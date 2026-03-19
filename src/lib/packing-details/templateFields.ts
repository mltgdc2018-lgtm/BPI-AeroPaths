export interface RectField {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PACKING_DETAIL_TEMPLATE_META = {
  coordinateSystem: "origin_bottom_left",
  baseSize: { width: 550, height: 400 },
} as const;

export const PACKING_DETAIL_FIELDS = {
  shipment_value: { x: 116, y: 349, width: 120, height: 18 },
  pallet_no_value: { x: 239, y: 330, width: 120, height: 44 },
  product_value: { x: 436, y: 355, width: 84, height: 14 },

  ship_by_air: { x: 147, y: 309, width: 10, height: 10 },
  ship_by_sea: { x: 203, y: 309, width: 10, height: 10 },
  ship_by_courier: { x: 257, y: 309, width: 10, height: 10 },

  ship_by_word_air: { x: 155, y: 309, width: 30, height: 12 },
  ship_by_word_sea: { x: 211, y: 309, width: 34, height: 12 },
  ship_by_word_courier: { x: 263, y: 309, width: 54, height: 12 },

  product_word_inverter: { x: 342, y: 330, width: 60, height: 12 },
  product_word_tc: { x: 414, y: 330, width: 22, height: 12 },

  item_row_1: { x: 74, y: 263, width: 216, height: 18 },
  qty_row_1: { x: 253, y: 263, width: 54, height: 18 },
  item_row_2: { x: 74, y: 242, width: 216, height: 18 },
  qty_row_2: { x: 253, y: 242, width: 54, height: 18 },
  item_row_3: { x: 74, y: 221, width: 216, height: 18 },
  qty_row_3: { x: 253, y: 221, width: 54, height: 18 },
  item_row_4: { x: 74, y: 200, width: 216, height: 18 },
  qty_row_4: { x: 253, y: 200, width: 54, height: 18 },
  item_row_5: { x: 74, y: 179, width: 216, height: 18 },
  qty_row_5: { x: 253, y: 179, width: 54, height: 18 },
  item_row_6: { x: 74, y: 158, width: 216, height: 18 },
  qty_row_6: { x: 253, y: 158, width: 54, height: 18 },
  item_row_7: { x: 74, y: 137, width: 216, height: 18 },
  qty_row_7: { x: 253, y: 137, width: 54, height: 18 },
  item_row_8: { x: 74, y: 116, width: 216, height: 18 },
  qty_row_8: { x: 253, y: 116, width: 54, height: 18 },
  item_row_9: { x: 74, y: 95, width: 216, height: 18 },
  qty_row_9: { x: 253, y: 95, width: 54, height: 18 },

  pkg_110x110x115: { x: 329, y: 290, width: 10, height: 10 },
  pkg_110x110x90: { x: 329, y: 269, width: 10, height: 10 },
  pkg_110x110x65: { x: 329, y: 248, width: 10, height: 10 },
  pkg_80x120x115: { x: 329, y: 227, width: 10, height: 10 },
  pkg_80x120x90: { x: 329, y: 206, width: 10, height: 10 },
  pkg_80x120x65: { x: 329, y: 185, width: 10, height: 10 },
  pkg_rtn: { x: 329, y: 164, width: 10, height: 10 },
  pkg_wrap_left: { x: 329, y: 143, width: 10, height: 10 },
  pkg_27x27x22: { x: 439, y: 290, width: 10, height: 10 },
  pkg_53x53x19: { x: 439, y: 269, width: 10, height: 10 },
  pkg_42x46x68: { x: 439, y: 248, width: 10, height: 10 },
  pkg_47x66x68: { x: 439, y: 227, width: 10, height: 10 },
  pkg_53x53x58: { x: 439, y: 206, width: 10, height: 10 },
  pkg_57x64x84: { x: 439, y: 185, width: 10, height: 10 },
  pkg_68x74x86: { x: 439, y: 164, width: 10, height: 10 },
  pkg_70x100x90: { x: 439, y: 143, width: 10, height: 10 },

  type_pallet: { x: 518, y: 269, width: 10, height: 10 },
  type_box: { x: 518, y: 207, width: 10, height: 10 },
  type_wrap: { x: 518, y: 143, width: 10, height: 10 },

  type_word_pallet: { x: 513, y: 265, width: 52, height: 16 },
  type_word_box: { x: 519, y: 203, width: 36, height: 16 },
  type_word_wrap: { x: 513, y: 139, width: 44, height: 16 },

  total_qty_main_value: { x: 395, y: 99, width: 88, height: 18 },
  qr_area: { x: 490, y: 329, width: 35, height: 35 },
} as const satisfies Record<string, RectField>;

export type PackingDetailFieldKey = keyof typeof PACKING_DETAIL_FIELDS;
