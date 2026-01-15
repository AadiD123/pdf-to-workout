// Standard barbell weight
export const BARBELL_WEIGHT = 45; // lbs

// Common plate weights (in lbs)
export const STANDARD_PLATES = [45, 35, 25, 10, 5, 2.5];

export interface PlateConfiguration {
  weight: number;
  available: number;
}

export interface PlateCalculationResult {
  plates: { weight: number; count: number }[];
  totalWeight: number;
  exact: boolean;
  barbellWeight: number;
}

let plateConfigurationCache: PlateConfiguration[] | null = null;
let barbellWeightCache: number | null = null;

export function setPlateConfigurationCache(config: PlateConfiguration[]): void {
  plateConfigurationCache = config;
}

export function setBarbellWeightCache(weight: number): void {
  barbellWeightCache = weight;
}

export function getBarbellWeight(): number {
  return barbellWeightCache ?? BARBELL_WEIGHT;
}

/**
 * Calculate the number of plates needed for each side of the barbell
 * @param targetWeight - Total target weight including barbell
 * @param availablePlates - Array of available plate configurations
 * @param barbellWeight - Weight of the barbell (default 45 lbs)
 * @returns Calculation result with plates per side
 */
export function calculatePlates(
  targetWeight: number,
  availablePlates: PlateConfiguration[] = STANDARD_PLATES.map(w => ({ weight: w, available: 10 })),
  barbellWeight: number = BARBELL_WEIGHT
): PlateCalculationResult {
  // Weight to load (subtract barbell weight and divide by 2 for each side)
  const weightPerSide = (targetWeight - barbellWeight) / 2;

  if (weightPerSide <= 0) {
    return {
      plates: [],
      totalWeight: barbellWeight,
      exact: targetWeight === barbellWeight,
      barbellWeight
    };
  }

  // Sort plates by weight (descending)
  const sortedPlates = [...availablePlates].sort((a, b) => b.weight - a.weight);

  let remainingWeight = weightPerSide;
  const usedPlates: { weight: number; count: number }[] = [];
  const plateUsage = new Map<number, number>();

  // Greedy algorithm: use heaviest plates first
  for (const plate of sortedPlates) {
    if (remainingWeight < plate.weight || plate.available === 0) {
      continue;
    }

    const countNeeded = Math.min(
      Math.floor(remainingWeight / plate.weight),
      plate.available
    );

    if (countNeeded > 0) {
      plateUsage.set(plate.weight, countNeeded);
      remainingWeight -= countNeeded * plate.weight;
      usedPlates.push({ weight: plate.weight, count: countNeeded });
    }

    if (remainingWeight === 0) break;
  }

  // Calculate actual total weight
  const loadedWeightPerSide = usedPlates.reduce(
    (sum, p) => sum + p.weight * p.count,
    0
  );
  const totalWeight = barbellWeight + loadedWeightPerSide * 2;

  return {
    plates: usedPlates,
    totalWeight,
    exact: remainingWeight === 0,
    barbellWeight
  };
}

/**
 * Format plate calculation result as a readable string
 */
export function formatPlateResult(result: PlateCalculationResult): string {
  if (result.plates.length === 0) {
    return `Bar only (${result.barbellWeight} lbs)`;
  }

  const perSide = result.plates
    .map(p => `${p.count}×${p.weight}`)
    .join(' + ');

  return `${perSide} per side`;
}

/**
 * Get default plate configuration from localStorage or return standard
 */
export function getPlateConfiguration(): PlateConfiguration[] {
  return (
    plateConfigurationCache ??
    STANDARD_PLATES.map((weight) => ({ weight, available: 10 }))
  );
}

/**
 * Save plate configuration to in-memory cache
 */
export function savePlateConfiguration(config: PlateConfiguration[]): void {
  setPlateConfigurationCache(config);
}

