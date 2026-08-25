import type { RoomStage } from "../engine/types";

export interface Seat { x: number; y: number; standing?: boolean; }
export const SEATS: Record<RoomStage, Seat[]> = {
  apartment: [{ x: 620, y: 642 }],
  kitchen: [{ x: 560, y: 650 }, { x: 910, y: 650 }],
  coworking: [{ x: 390, y: 648 }, { x: 650, y: 648 }, { x: 900, y: 648 }, { x: 1160, y: 648 }, { x: 1330, y: 648 }],
  office: [{ x: 300, y: 660 }, { x: 510, y: 660 }, { x: 730, y: 660 }, { x: 950, y: 660 }, { x: 1170, y: 660 }, { x: 1370, y: 660 }, { x: 400, y: 450 }, { x: 650, y: 450 }, { x: 900, y: 450 }, { x: 1150, y: 450 }, { x: 1320, y: 450 }, { x: 1450, y: 450 }],
  floor: Array.from({ length: 25 }, (_, index) => ({ x: 170 + (index % 9) * 155, y: index < 9 ? 675 : index < 18 ? 505 : 340 })),
  hq: Array.from({ length: 34 }, (_, index) => ({ x: 145 + (index % 11) * 132, y: index < 11 ? 700 : index < 22 ? 510 : 300 })),
  downsized: Array.from({ length: 12 }, (_, index) => ({ x: 260 + (index % 6) * 215, y: index < 6 ? 660 : 430 })),
};
