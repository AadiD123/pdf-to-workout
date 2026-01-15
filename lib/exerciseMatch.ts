import { EXERCISE_NAMES, EXERCISE_NAME_SET } from "./exerciseCatalog";

export const normalizeExerciseName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizedToCanonical = new Map(
  EXERCISE_NAMES.map((name) => [normalizeExerciseName(name), name])
);

const getTokenScore = (target: string, candidate: string) => {
  const targetTokens = new Set(target.split(" "));
  const candidateTokens = new Set(candidate.split(" "));
  const intersection = [...targetTokens].filter((token) =>
    candidateTokens.has(token)
  ).length;
  const union = new Set([...targetTokens, ...candidateTokens]).size;
  return union === 0 ? 0 : intersection / union;
};

export const findCatalogMatch = (name: string): string | null => {
  if (!name) return null;
  const lowered = name.toLowerCase().trim();
  if (EXERCISE_NAME_SET.has(lowered)) {
    return EXERCISE_NAMES.find(
      (exercise) => exercise.toLowerCase() === lowered
    ) ?? null;
  }

  const normalized = normalizeExerciseName(name);
  const direct = normalizedToCanonical.get(normalized);
  if (direct) return direct;

  let bestName: string | null = null;
  let bestScore = 0;
  EXERCISE_NAMES.forEach((exercise) => {
    const normalizedExercise = normalizeExerciseName(exercise);
    if (normalizedExercise.includes(normalized)) {
      const score = normalized.length / normalizedExercise.length;
      if (score > bestScore) {
        bestName = exercise;
        bestScore = score;
      }
      return;
    }
    const score = getTokenScore(normalized, normalizedExercise);
    if (score > bestScore) {
      bestName = exercise;
      bestScore = score;
    }
  });

  if (bestName && bestScore >= 0.6) {
    return bestName;
  }
  return null;
};

