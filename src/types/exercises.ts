export interface ExerciseResult {
  name: string;
  stage: string;
  reps: number;
  confidence: number;
  timestamp: number;
  warnings?: string[];
}
