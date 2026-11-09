export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 10;
export const DEFAULT_QUESTIONS = 3;

export type Role = "interviewer" | "candidate";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface InterviewRequest {
  jobDescription: string;
  totalQuestions: number;
  messages: ChatMessage[];
}

export interface QuestionScore {
  question: string;
  score: number;
  comment: string;
  suggestedAnswer: string;
}

export interface Evaluation {
  overallScore: number;
  summary: string;
  questionScores: QuestionScore[];
  strengths: string[];
  improvements: string[];
}

export type InterviewResponse =
  | { type: "question"; questionNumber: number; question: string }
  | { type: "evaluation"; evaluation: Evaluation };
