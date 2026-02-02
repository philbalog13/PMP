export type WorkshopCategory = 'tpe' | 'wallet' | 'hsm';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface WorkshopSection {
    title: string;
    content: string;
    diagram?: string; // Path to diagram or specific diagram ID
    code?: string;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export interface ExerciseStep {
    id: string;
    instruction: string;
    type: 'action' | 'input' | 'verification';
    expectedValue?: string;
}

export interface Workshop {
    id: string;
    title: string;
    description: string;
    category: WorkshopCategory;
    difficulty: Difficulty;
    durationMinutes: number;
    theory: {
        sections: WorkshopSection[];
    };
    exercise: {
        type: string;
        description: string;
        steps?: ExerciseStep[];
    };
    quiz: {
        questions: Question[];
    };
}
