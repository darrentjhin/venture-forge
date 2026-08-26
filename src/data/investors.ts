import { SEGMENTS, type SegmentId } from "./segments";
import type { Investor, InvestorKind } from "../engine/types";

const PEOPLE = [
  "Dana Reyes", "Mara Voss", "Eli Navarro", "Priya Calder", "Jon Bellamy", "Nia Arden", "Theo Mercer", "Lena Sato",
  "Owen Park", "Imani Wells", "Ravi Danner", "June Talbot", "Micah Solis", "Ada Rowan", "Noah Pike", "Zara Benton",
  "Kira Lennox", "Leon Hart", "Maya Corwin", "Emil Wren", "Tessa Vale", "Arun Foley", "Sana Beck", "Hugo Kim",
  "Cleo Ames", "Drew Laurent", "Nora Finch", "Ian Mora", "Asha Quinn", "Felix North", "Mina Shaw", "Cole Ibarra",
  "Rhea Moss", "Vik Hale", "Elena Cross", "Samir West", "Mae Rivers", "Luis Crane", "Anika Frost", "Benji Stone",
] as const;

const FIRMS = [
  "Ridgeline Capital", "Lantern Grove", "North Pier Ventures", "Common Thread Fund", "Vela Partners", "Paper Kite Capital", "Fieldstone Ventures", "Signal House",
  "Bright Acre", "Morrow Capital", "Harborline Fund", "Cinder Peak", "Tall Pine Ventures", "Open Current", "Juniper Lane", "Westward Seed",
  "Kindred Works", "Copper Hill", "Stillwater Ventures", "Daybreak Fund", "Sable Ridge", "Anchor & Loom", "Quiet Giant", "Arcwell Partners",
  "Civic Orchard", "Maproom Capital", "Red Fern Ventures", "Blue Ember", "Long Table Fund", "Foundry Lake", "Crescent Works", "Trellis Peak",
  "Cloudline Partners", "Granite Harbor", "Fifth Window", "Silver Grove", "Northstar Loom", "Clearwell Capital", "Riverglass Fund", "Afterlight Partners",
] as const;

const PORTFOLIO_WORDS = ["Relay", "Mosaic", "Nook", "Beacon", "Parcel", "Orbit", "Ledger", "Quarry", "Spruce", "Canvas", "Pilot", "Harbor"] as const;
const KINDS: InvestorKind[] = ["angel", "preseed", "seed", "seriesA", "growth"];
const CHECKS: Record<InvestorKind, [number, number, number]> = {
  angel: [25_000, 150_000, 0], preseed: [150_000, 750_000, 1_000], seed: [500_000, 2_500_000, 10_000],
  seriesA: [2_000_000, 8_000_000, 80_000], growth: [8_000_000, 30_000_000, 500_000],
};

export const INVESTOR_COUNT = PEOPLE.length;

export function createInvestorRoster(): Investor[] {
  return PEOPLE.map((name, index) => {
    const kind = KINDS[Math.floor(index / 8)];
    const [checkMin, checkMax, minMonthlyRevenue] = CHECKS[kind];
    const thesisA = SEGMENTS[index % SEGMENTS.length];
    const thesisB = SEGMENTS[(index + 2) % SEGMENTS.length];
    return {
      id: `investor-${index + 1}`, name, firm: FIRMS[index], kind,
      checkMin, checkMax, leadsRounds: index % 4 !== 1,
      temperament: (["fast", "thorough", "tyreKicker", "cutthroat"] as const)[index % 4],
      demandsBoardSeat: kind === "seriesA" || kind === "growth" || index % 7 === 0,
      thesisSegments: [thesisA, thesisB] as SegmentId[],
      minMonthlyRevenue: minMonthlyRevenue + (index % 4) * Math.max(500, minMonthlyRevenue * .2),
      maxTechDebt: Math.max(18, 80 - Math.floor(index / 2)),
      portfolio: [`${PORTFOLIO_WORDS[index % PORTFOLIO_WORDS.length]} Labs`, `${PORTFOLIO_WORDS[(index + 5) % PORTFOLIO_WORDS.length]} Systems`],
      discovered: index === 0, researched: false, relationship: index === 0 ? 22 : 0, lastContactWeek: null, passes: [],
    };
  });
}
