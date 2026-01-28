import { TraceResult, TraceStep } from '../types';

export class StepByStepVisualizer {
    static visualize(trace: TraceResult<any>): string {
        return trace.steps.map((s, i) =>
            `Step ${i + 1}: ${s.name}\n  Desc: ${s.description}\n  In : ${s.input}\n  Out: ${s.output}`
        ).join('\n---\n');
    }
}
