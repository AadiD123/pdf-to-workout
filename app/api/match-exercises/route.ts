import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseUser } from "@/lib/supabaseAuth";
import { matchExercisesToCatalog } from "@/lib/gemini";
import { EXERCISE_NAMES } from "@/lib/exerciseCatalog";

export async function POST(request: NextRequest) {
  const authResult = await requireSupabaseUser(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = await request.json();
  const names = Array.isArray(body?.names) ? body.names : [];
  if (!names.length) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const result = await matchExercisesToCatalog(names, EXERCISE_NAMES);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to match exercises:", error);
    return NextResponse.json({ matches: [] });
  }
}

