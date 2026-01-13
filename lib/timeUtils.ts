/**
 * Parse time string to seconds
 * Handles formats like: "60 sec", "1 min", "1:30", "90s", "1.5 min"
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  
  const str = timeStr.toLowerCase().trim();
  
  // Format: "1:30" or "0:45"
  const colonMatch = str.match(/(\d+):(\d+)/);
  if (colonMatch) {
    const minutes = parseInt(colonMatch[1]);
    const seconds = parseInt(colonMatch[2]);
    return minutes * 60 + seconds;
  }
  
  // Format: "90 sec" or "90s" or "90 seconds"
  const secMatch = str.match(/(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?/);
  if (secMatch) {
    return Math.round(parseFloat(secMatch[1]));
  }
  
  // Format: "1.5 min" or "1 minute" or "2 minutes"
  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?/);
  if (minMatch) {
    return Math.round(parseFloat(minMatch[1]) * 60);
  }
  
  // Just a number, assume seconds
  const numMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) {
    return Math.round(parseFloat(numMatch[1]));
  }
  
  return 0;
}

/**
 * Format seconds to readable time string
 * e.g., 90 -> "1:30", 45 -> "0:45", 120 -> "2:00"
 */
export function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to display string with units
 * e.g., 90 -> "1m 30s", 45 -> "45s", 120 -> "2m"
 */
export function formatSecondsToDisplay(seconds: number): string {
  if (!seconds || seconds === 0) return '0s';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

