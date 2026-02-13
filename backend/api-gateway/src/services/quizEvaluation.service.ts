export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
}

export interface SubmittedAnswer {
    questionId: string;
    selectedOptionIndex: number;
}

export interface QuizQuestionResult {
    questionId: string;
    question: string;
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
}

export interface QuizEvaluationResult {
    correctAnswers: number;
    maxScore: number;
    percentage: number;
    questionResults: QuizQuestionResult[];
}

function normalizeAnswerValue(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) {
        return null;
    }

    return Math.floor(numericValue);
}

function extractQuestionId(rawAnswer: Record<string, unknown>): string | null {
    const candidate = rawAnswer.questionId ?? rawAnswer.question_id ?? rawAnswer.id;
    if (typeof candidate !== 'string') {
        return null;
    }

    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
}

function extractSelectedOption(rawAnswer: Record<string, unknown>): number | null {
    const candidate =
        rawAnswer.selectedOptionIndex
        ?? rawAnswer.selected_option_index
        ?? rawAnswer.selectedOption
        ?? rawAnswer.selected
        ?? rawAnswer.answer
        ?? rawAnswer.choice;

    return normalizeAnswerValue(candidate);
}

export function normalizeSubmittedAnswers(rawAnswers: unknown): SubmittedAnswer[] {
    if (!Array.isArray(rawAnswers)) {
        return [];
    }

    const dedupedAnswers = new Map<string, number>();

    for (const rawEntry of rawAnswers) {
        if (!rawEntry || typeof rawEntry !== 'object') {
            continue;
        }

        const answerRecord = rawEntry as Record<string, unknown>;
        const questionId = extractQuestionId(answerRecord);
        const selectedOptionIndex = extractSelectedOption(answerRecord);

        if (!questionId || selectedOptionIndex === null || selectedOptionIndex < 0) {
            continue;
        }

        dedupedAnswers.set(questionId, selectedOptionIndex);
    }

    return Array.from(dedupedAnswers.entries()).map(([questionId, selectedOptionIndex]) => ({
        questionId,
        selectedOptionIndex
    }));
}

export function sanitizeQuizQuestions(questions: QuizQuestion[]): Array<Omit<QuizQuestion, 'correctOptionIndex'>> {
    return questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        explanation: question.explanation
    }));
}

export function evaluateQuizSubmission(
    questions: QuizQuestion[],
    submittedAnswers: SubmittedAnswer[]
): QuizEvaluationResult {
    const answerByQuestionId = new Map(
        submittedAnswers.map((answer) => [answer.questionId, answer.selectedOptionIndex])
    );

    const questionResults: QuizQuestionResult[] = questions.map((question) => {
        const selectedOptionIndex = answerByQuestionId.has(question.id)
            ? answerByQuestionId.get(question.id) ?? null
            : null;
        const isCorrect = selectedOptionIndex === question.correctOptionIndex;

        return {
            questionId: question.id,
            question: question.question,
            selectedOptionIndex,
            correctOptionIndex: question.correctOptionIndex,
            isCorrect,
            explanation: question.explanation || ''
        };
    });

    const correctAnswers = questionResults.filter((result) => result.isCorrect).length;
    const maxScore = questions.length;
    const percentage = maxScore > 0 ? Math.round((correctAnswers / maxScore) * 100) : 0;

    return {
        correctAnswers,
        maxScore,
        percentage,
        questionResults
    };
}
