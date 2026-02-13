import {
    evaluateQuizSubmission,
    normalizeSubmittedAnswers,
    QuizQuestion
} from '../services/quizEvaluation.service';

describe('quizEvaluation.service', () => {
    const questions: QuizQuestion[] = [
        {
            id: 'q1',
            question: 'Question 1',
            options: ['A', 'B', 'C'],
            correctOptionIndex: 1,
            explanation: 'B is correct.'
        },
        {
            id: 'q2',
            question: 'Question 2',
            options: ['A', 'B', 'C'],
            correctOptionIndex: 0,
            explanation: 'A is correct.'
        }
    ];

    it('normalizes answers from mixed payloads and deduplicates by question', () => {
        const normalized = normalizeSubmittedAnswers([
            { questionId: 'q1', selectedOptionIndex: 0 },
            { question_id: 'q2', selected_option_index: 0 },
            { id: 'q1', answer: 1 },
            { questionId: 'q3', answer: 'invalid' },
            null
        ]);

        expect(normalized).toEqual([
            { questionId: 'q1', selectedOptionIndex: 1 },
            { questionId: 'q2', selectedOptionIndex: 0 }
        ]);
    });

    it('evaluates score using server-side correct answers', () => {
        const answers = [
            { questionId: 'q1', selectedOptionIndex: 1 },
            { questionId: 'q2', selectedOptionIndex: 2 }
        ];

        const evaluation = evaluateQuizSubmission(questions, answers);

        expect(evaluation.correctAnswers).toBe(1);
        expect(evaluation.maxScore).toBe(2);
        expect(evaluation.percentage).toBe(50);
        expect(evaluation.questionResults[0].isCorrect).toBe(true);
        expect(evaluation.questionResults[1].isCorrect).toBe(false);
    });

    it('marks unanswered questions as incorrect', () => {
        const evaluation = evaluateQuizSubmission(questions, [
            { questionId: 'q1', selectedOptionIndex: 1 }
        ]);

        expect(evaluation.correctAnswers).toBe(1);
        expect(evaluation.questionResults[1].selectedOptionIndex).toBeNull();
        expect(evaluation.questionResults[1].isCorrect).toBe(false);
    });
});
