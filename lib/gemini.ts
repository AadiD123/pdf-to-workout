import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function extractWorkoutFromImage(
  imageData: string,
  mimeType: string
) {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `You are a workout plan extraction assistant. Analyze the provided image of a workout plan and extract all exercise information into a structured JSON format.

The workout plan may be organized by days (e.g., "Day 1: Push", "Day 2: Pull", "Monday - Chest", etc.) or may be a single workout. Some days might be REST DAYS or RECOVERY DAYS with no exercises.

Please extract the following information:
- Workout plan name (overall title)
- Days/splits (if the plan is organized by days)
- Whether each day is a rest day
- For each exercise:
  * Exercise name
  * Number of sets
  * Exercise type: "reps" for rep-based exercises, "time" for time-based exercises (planks, holds, cardio intervals)
  * Number of reps (can be a range like "8-12" or specific number like "10") OR duration for time-based exercises (e.g., "60 sec", "1 min", "30s")
  * Weight/resistance (if specified)
  * Rest time between sets (if specified)
  * Any notes, tips, or comments about the exercise (form cues, tempo, technique notes, etc.)

Return ONLY a valid JSON object with this structure:

If the workout is organized by DAYS/SPLITS:
{
  "name": "Workout Plan Name",
  "days": [
    {
      "name": "Day 1: Push",
      "isRestDay": false,
      "exercises": [
        {
          "name": "Bench Press",
          "type": "reps",
          "sets": 3,
          "reps": "8-12",
          "weight": "135 lbs",
          "restTime": "90 sec",
          "notes": "Focus on slow eccentric, pause at bottom"
        },
        {
          "name": "Dumbbell Flyes",
          "type": "reps",
          "sets": 3,
          "reps": ["12", "10", "8"],
          "weight": "30 lbs",
          "restTime": "60 sec",
          "notes": "Drop sets - decreasing reps each set"
        },
        {
          "name": "Plank",
          "type": "time",
          "sets": 3,
          "reps": "60 sec",
          "restTime": "60 sec",
          "notes": "Keep core tight"
        }
      ]
    },
    {
      "name": "Day 2: Rest",
      "isRestDay": true,
      "exercises": []
    }
  ]
}

If it's a SINGLE workout (no day splits):
{
  "name": "Workout Plan Name",
  "days": [
    {
      "name": "Full Body Workout",
      "isRestDay": false,
      "exercises": [...]
    }
  ]
}

Important:
- Return ONLY the JSON object, no additional text or markdown formatting
- If exercises are grouped by days, create separate day objects
- If no day grouping exists, put all exercises in a single day called "Full Body Workout" or similar
- Identify REST DAYS or RECOVERY DAYS: Set "isRestDay": true and "exercises": [] for those days
- Look for keywords like "Rest", "Recovery", "Off Day", "Active Recovery", "Deload", etc.
- Determine exercise type:
  * Use "type": "time" for exercises measured in time/duration (planks, wall sits, holds, cardio intervals, etc.)
  * Use "type": "reps" for exercises measured in repetitions (most strength training)
  * Look for time indicators: "sec", "seconds", "min", "minutes", ":30", "0:45", etc.
- For time-based exercises, put the duration in the "reps" field (e.g., "60 sec", "1 min", "30s")
- IMPORTANT: If sets have different target reps, use an array: "reps": ["12", "10", "8"] (descending), ["8", "10", "12"] (ascending), or ["10", "12", "15+"] (progressive)
- If all sets have the same target, use a single value: "reps": "10" or "reps": "8-12"
- If an exercise doesn't have weight, rest time, or notes specified, omit those fields
- Extract ALL notes, tips, form cues, or comments associated with each exercise
- Notes can include: tempo (e.g., "3-1-1-0"), technique reminders (e.g., "keep back straight"), equipment variations (e.g., "can use dumbbells"), or any other relevant information
- Be as accurate as possible with the exercise names and day labels
- Look for day indicators like "Day 1", "Day 2", "Monday", "Tuesday", "Push", "Pull", "Legs", "Upper", "Lower", etc.
- Preserve the exact format of sets and reps/duration as shown (e.g., "3x10", "8-12", "15+", "AMRAP", "60 sec", "1:30")
- If there are completed/recorded sets with specific weights or reps, include those in the notes field`;

  const imageParts = [
    {
      inlineData: {
        data: imageData,
        mimeType: mimeType,
      },
    },
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  // Clean up the response - remove markdown code blocks if present
  let cleanedText = text.trim();
  if (cleanedText.startsWith("```json")) {
    cleanedText = cleanedText.replace(/```json\n?/, "").replace(/```\n?$/, "");
  } else if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/```\n?/, "").replace(/```\n?$/, "");
  }

  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Failed to parse Gemini response:", cleanedText);
    throw new Error("Failed to parse workout data from image");
  }
}
