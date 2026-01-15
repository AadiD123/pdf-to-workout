import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireSupabaseUser } from '@/lib/supabaseAuth';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GOOGLE_GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSupabaseUser(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { exerciseName, sets, reps, weight, type } = await request.json();

    if (!exerciseName) {
      return NextResponse.json(
        { error: 'Exercise name is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `You are a fitness expert. Given the exercise "${exerciseName}" with ${sets} sets of ${reps}${weight ? ` at ${weight}` : ''}, suggest 3 alternative exercises that:
1. Target the same primary muscle groups
2. Use similar or readily available equipment
3. Have similar difficulty level
4. Can be performed with the same rep/set scheme

For context, this exercise is ${type === 'time' ? 'time-based (like planks, holds)' : 'rep-based'}.

Return ONLY a JSON array with exactly 3 alternatives in this format:
[
  {
    "name": "Exercise Name",
    "reason": "Brief explanation (1 sentence) of why this is a good substitute",
    "equipment": "Required equipment"
  }
]

Important:
- Keep exercise names concise and clear
- Each reason should be one sentence explaining the similarity
- Do NOT include emojis
- Return ONLY the JSON array, no markdown or additional text`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    // Remove markdown code blocks if present
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const alternatives = JSON.parse(text);

    if (!Array.isArray(alternatives) || alternatives.length !== 3) {
      throw new Error('Invalid response format');
    }

    return NextResponse.json({ alternatives });
  } catch (error) {
    console.error('Error getting exercise substitutes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get exercise substitutes' },
      { status: 500 }
    );
  }
}

