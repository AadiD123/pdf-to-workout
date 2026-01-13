# Quick Setup Guide

## Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

## Step 2: Configure Environment

1. Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

2. Add your API key to the file:

```
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
```

## Step 3: Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Step 4: Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## You're Ready!

1. Upload an image or PDF of your workout plan
2. Start tracking your workouts
3. Monitor your progress over time

## Troubleshooting

**Issue**: "GOOGLE_GEMINI_API_KEY is not set"
- **Solution**: Make sure you created `.env.local` in the project root and added your API key

**Issue**: "Failed to extract workout"
- **Solution**: Check that your API key is valid and your image/PDF is clear and readable
- For PDFs, ensure the workout plan is on the first page

**Issue**: Port 3000 already in use
- **Solution**: Run `npm run dev -- -p 3001` to use port 3001 instead

## Need Help?

Check the full [README.md](README.md) for detailed documentation.

