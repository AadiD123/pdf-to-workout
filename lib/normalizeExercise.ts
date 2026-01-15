export const extractRpeFromWeight = (weight?: string): number | null => {
  if (!weight) return null;
  const match = weight.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*rpe\b/i);
  if (!match) return null;
  return Number(match[1]);
};

const hasWeightUnits = (value: string) =>
  /\b(lb|lbs|kilogram|kilograms|kg)\b/i.test(value);

export const normalizeExerciseFields = (input: {
  weight?: string;
  targetNotes?: string;
}) => {
  const weight = input.weight?.trim();
  if (!weight) return input;

  const rpe = extractRpeFromWeight(weight);
  if (rpe === null) return input;

  // If weight string is actually an RPE (no units), move it to target notes.
  if (!hasWeightUnits(weight)) {
    const nextNotes = [input.targetNotes?.trim(), `RPE ${rpe}`]
      .filter(Boolean)
      .join(" • ");
    return {
      ...input,
      weight: undefined,
      targetNotes: nextNotes || undefined,
    };
  }

  return input;
};

