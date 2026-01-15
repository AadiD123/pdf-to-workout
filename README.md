# Workout Tracker - AI-Powered Fitness Companion

Transform your workout plans into interactive trackers with AI. Upload images of your workout plans and track your progress with ease.

## Features

- **AI-Powered Extraction**: Upload an image or PDF of your workout plan and let Google Gemini Vision API extract the exercises, sets, reps, weights, and notes automatically
- **PDF Support**: Automatically converts PDF workout plans to images for processing
- **Mobile-First Design**: Optimized for mobile use with a clean, touch-friendly interface inspired by the Strong app
- **Fully Editable**: Edit workout names, day names, and exercise names with inline editing
- **Home Dashboard**: Clean home view displaying all workout days with stats
- **Multi-Day Workout Splits**: Automatically detects and organizes workout plans split by days (e.g., "Day 1: Push", "Day 2: Pull", "Day 3: Legs")
- **Workout Session Tracking**: Start workout sessions with confirmation and track total workout time
- **Interactive Set Tracking**: Track completed sets with large, easy-to-tap checkmarks and inline weight/rep inputs
- **Floating Rest Timer**: Compact floating timer that auto-starts after completing a set, doesn't block the screen
- **Progress History**: View your workout history with beautiful visualizations and statistics
- **Exercise Notes**: Automatically extracts exercise notes from uploaded plans (form cues, tempo, technique tips) and allows you to add/edit notes for any exercise
- **Session Management**: Complete workout sessions with a beautiful bottom-sheet interface
- **Local Storage**: All your data is stored locally in your browser - no server required
- **Dark Mode**: Automatic dark mode support based on system preferences
- **Touch-Optimized**: Large tap targets and smooth animations for the best mobile experience

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- A Google Gemini API key (get one at https://makersuite.google.com/app/apikey)

### Installation

1. Clone this repository or navigate to the project directory:

```bash
cd pdf-to-workout
```

2. Install dependencies:

```bash
npm install
```

3. Copy `.env.local.example` to `.env.local` and add your Google Gemini API key:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your API key:

```env
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Uploading a Workout Plan

1. On the home page, drag and drop an image or PDF of your workout plan, or tap to select a file
2. Supported formats: JPG, PNG, WebP, PDF
3. For PDFs, the app will automatically convert the first page to an image
4. The app will process the file using AI and extract the workout information
5. If your workout is split by days (e.g., Push/Pull/Legs), the app will automatically organize exercises by day
6. Your workout plan will be displayed with all exercises ready to track

### Starting a Workout

1. From the home screen, tap the workout day you want to do
2. Confirm to start your workout session
3. A workout clock starts tracking your total workout time

### Tracking Your Workout

1. For each exercise and set:
   - See target sets, reps, and weight displayed above the table
   - Tap the weight/reps fields to enter your actual numbers
   - Tap the checkmark when you complete the set
   - Sets turn green when completed
2. Rest timer automatically appears after completing a set:
   - Compact timer floats in bottom-right corner
   - Doesn't block the screen - you can scroll freely
   - Uses the rest time specified in your workout plan
   - Adjust timer up/down by 15 seconds with +/- buttons if needed
   - Get visual and audio alerts when rest is complete
3. Edit any text by tapping on it:
   - Tap workout name to rename your plan
   - Double-tap day names to edit them
   - Tap exercise names to customize them
4. View and edit notes for each exercise - notes are automatically extracted from your workout plan or you can add your own
5. The workout clock shows your total workout duration
6. When finished, tap "Finish Workout" to save your session

### Completing a Session

1. Once you're done with your workout, click "Complete Workout"
2. Add optional session notes (e.g., "Felt strong today", "Lower back slightly sore")
3. The session will be saved to your history and your progress will be reset for the next workout

### Viewing Progress

1. Click the progress icon (📈) in the top right of the tracker
2. View statistics including:
   - Total number of workout sessions
   - Average completion rate
   - Exercise-specific performance
   - Complete session history with dates and notes

### Starting a New Workout Plan

1. Click the upload icon (📤) in the top right
2. Confirm that you want to replace your current workout plan
3. Upload a new workout image

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini Vision API
- **PDF Processing**: PDF.js (pdfjs-dist)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Storage**: Browser Local Storage

## Project Structure

```
pdf-to-workout/
├── app/
│   ├── api/
│   │   └── extract-workout/
│   │       └── route.ts          # API endpoint for workout extraction
│   ├── globals.css               # Global styles and animations
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main application page
├── components/
│   ├── ExerciseCard.tsx          # Individual exercise tracking card
│   ├── ProgressView.tsx          # Progress and history view
│   ├── UploadZone.tsx            # Drag-and-drop upload component
│   └── WorkoutTracker.tsx        # Main workout tracking interface
├── hooks/
│   └── useWorkout.ts             # Custom hook for workout state management
├── lib/
│   ├── gemini.ts                 # Gemini API integration
│   ├── pdfToImage.ts             # PDF to image conversion utility
│   └── localStorage.ts           # Legacy local storage utilities (unused)
├── types/
│   └── workout.ts                # TypeScript type definitions
└── package.json
```

## Data Structure

All workout data is stored in Supabase and scoped to the authenticated user.

### Required tables

```sql
create table public.workout_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text,
  uploaded_at timestamptz,
  data jsonb not null,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plate_configuration jsonb,
  barbell_weight numeric
);

create table public.user_exercises (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  primary key (user_id, name)
);

create table public.exercise_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  stats jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, exercise_name)
);

alter table public.workout_plans enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_exercises enable row level security;
alter table public.exercise_stats enable row level security;

create policy "workout plans are user-owned"
on public.workout_plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user settings are user-owned"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user exercises are user-owned"
on public.user_exercises
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "exercise stats are user-owned"
on public.exercise_stats
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### Stored payloads

- **Workout Plan**: Contains workout name, upload date, workout days, and session history (stored as JSON in `workout_plans.data`)
- **Workout Days**: Organizes exercises by day/split (e.g., "Day 1: Push", "Day 2: Pull")
- **Exercises**: Each exercise has name, sets, reps, optional weight/rest time, and completion tracking
- **Set Records**: Individual set tracking with reps, weight, and completion status
- **Workout Sessions**: Historical records of completed workouts with dates, completed day, and notes

The app automatically detects whether your workout plan is:

- **Single-day**: All exercises in one workout
- **Multi-day split**: Exercises organized by days (Push/Pull/Legs, Upper/Lower, etc.)

## Privacy & Security

- All workout data is stored locally in your browser
- No workout data is sent to any server except the Gemini API for initial extraction
- Your API key is stored in environment variables and never exposed to the client
- You can clear your workout data at any time by uploading a new plan

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Troubleshooting

### "Failed to extract workout from image"

- Ensure your API key is correctly set in `.env.local`
- Make sure the image/PDF is clear and readable
- Try using a higher quality image or PDF
- For PDFs, ensure the workout plan is on the first page
- Check that the file contains a visible workout plan

### Data not persisting

- Verify Supabase env vars are set correctly
- Confirm the user is signed in and RLS policies are enabled

### API Rate Limits

- Google Gemini has rate limits on the free tier
- If you hit rate limits, wait a few minutes before trying again
- Consider upgrading to a paid plan for higher limits

## Deployment

Ready to deploy to production? See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to:

- ✅ **Vercel** (Recommended - one-click deploy)
- Netlify
- Railway
- Self-hosted

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com/new)
3. Add `GOOGLE_GEMINI_API_KEY` environment variable
4. Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions.

## PWA Installation

This app is a Progressive Web App (PWA) and can be installed on mobile devices:

**iOS:**

1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

**Android:**

1. Open in Chrome
2. Tap the "Install" prompt or menu → "Install app"

See [PWA_SETUP.md](./PWA_SETUP.md) for customization options.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Built with Next.js and Tailwind CSS
- AI-powered by Google Gemini
- Icons by Lucide React
- PDF processing by PDF.js
