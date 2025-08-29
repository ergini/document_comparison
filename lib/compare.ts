import { ContractItem } from "./extract";

export interface ComparisonMatch {
  hotel_name: string;
  room_type: string;
  period_start: string;
  period_end: string;
  price_a: number;
  price_b: number;
  currency: string;
  price_delta: number; // B - A
}

export interface ComparisonSummary {
  count_matches: number;
  median_delta: number;
  avg_delta: number;
}

export interface ComparisonResult {
  matches: ComparisonMatch[];
  only_in_a: ContractItem[];
  only_in_b: ContractItem[];
  summary: ComparisonSummary;
}

/**
 * Compare extracted file data and find matches
 * @param fileAData - Data from file A
 * @param fileBData - Data from file B
 * @returns ComparisonResult
 */
export function compareFiles(
  fileAData: ContractItem[],
  fileBData: ContractItem[]
): ComparisonResult {
  const matches: ComparisonMatch[] = [];
  const onlyInA: ContractItem[] = [];
  const onlyInB: ContractItem[] = [...fileBData];

  for (const itemA of fileAData) {
    const matchingItems = fileBData.filter((itemB) =>
      isMatchingItem(itemA, itemB)
    );

    if (matchingItems.length > 0) {
      const itemB = matchingItems[0];

      const indexInB = onlyInB.findIndex(
        (item) =>
          item.hotel_name === itemB.hotel_name &&
          item.room_type === itemB.room_type &&
          item.period_start === itemB.period_start &&
          item.period_end === itemB.period_end
      );
      if (indexInB >= 0) {
        onlyInB.splice(indexInB, 1);
      }

      matches.push({
        hotel_name: itemA.hotel_name,
        room_type: itemA.room_type,
        period_start: itemA.period_start,
        period_end: itemA.period_end,
        price_a: itemA.price,
        price_b: itemB.price,
        currency: itemA.currency,
        price_delta: itemB.price - itemA.price,
      });
    } else {
      onlyInA.push(itemA);
    }
  }

  const summary = calculateSummary(matches);

  return {
    matches,
    only_in_a: onlyInA,
    only_in_b: onlyInB,
    summary,
  };
}

/**
 * Check if two contract items match for comparison
 * @param itemA - Item from contract A
 * @param itemB - Item from contract B
 * @returns boolean - Whether items match
 */
function isMatchingItem(itemA: ContractItem, itemB: ContractItem): boolean {
  const normalizedHotelA = normalizeForComparison(itemA.hotel_name);
  const normalizedHotelB = normalizeForComparison(itemB.hotel_name);
  const hotelMatch = normalizedHotelA === normalizedHotelB;

  const roomMatch = isRoomTypeMatch(itemA.room_type, itemB.room_type);
  const currencyMatch = itemA.currency === itemB.currency;

  return hotelMatch && roomMatch && currencyMatch;
}

/**
 * Check if two room types match, handling different formatting
 * @param roomTypeA - Room type from contract A
 * @param roomTypeB - Room type from contract B
 * @returns boolean - Whether room types match
 */
function isRoomTypeMatch(roomTypeA: string, roomTypeB: string): boolean {
  const normalizedA = normalizeForComparison(roomTypeA);
  const normalizedB = normalizeForComparison(roomTypeB);

  if (normalizedA === normalizedB) {
    return true;
  }

  const baseRoomA = extractBaseRoomType(normalizedA);
  const baseRoomB = extractBaseRoomType(normalizedB);

  return baseRoomA === baseRoomB;
}

/**
 * Extract base room type by removing occupancy information and standardizing variations
 * @param roomType - Room type string
 * @returns string - Base room type
 */
function extractBaseRoomType(roomType: string): string {
  const occupancyTypes = [
    "single",
    "double",
    "triple",
    "sharing single",
    "sharing double",
    "sharing triple",
  ];
  let baseType = roomType;

  for (const occupancy of occupancyTypes) {
    baseType = baseType
      .replace(new RegExp(`\\b${occupancy}\\b`, "gi"), "")
      .trim();
  }

  baseType = baseType
    .replace(/\brooms?\b/gi, "room")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return baseType;
}

/**
 * Normalize string for comparison (case-insensitive, trim whitespace, remove punctuation)
 * @param value - String to normalize
 * @returns string - Normalized string
 */
function normalizeForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\*+/g, " ")
    .replace(/[\-_]/g, " ")
    .replace(/\(negombo\)/gi, " ")
    .replace(/\(colombo\)/gi, " ")
    .replace(/\(kandy\)/gi, " ")
    .replace(/\(galle\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate summary statistics for matches
 * @param matches - Array of comparison matches
 * @returns ComparisonSummary
 */
function calculateSummary(matches: ComparisonMatch[]): ComparisonSummary {
  if (matches.length === 0) {
    return {
      count_matches: 0,
      median_delta: 0,
      avg_delta: 0,
    };
  }

  const deltas = matches.map((match) => match.price_delta);

  const avg_delta =
    deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;

  const sortedDeltas = [...deltas].sort((a, b) => a - b);
  const median_delta =
    sortedDeltas.length % 2 === 0
      ? (sortedDeltas[sortedDeltas.length / 2 - 1] +
          sortedDeltas[sortedDeltas.length / 2]) /
        2
      : sortedDeltas[Math.floor(sortedDeltas.length / 2)];

  return {
    count_matches: matches.length,
    median_delta: Number(median_delta.toFixed(2)),
    avg_delta: Number(avg_delta.toFixed(2)),
  };
}
