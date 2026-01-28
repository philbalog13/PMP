"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StepByStepVisualizer = void 0;
class StepByStepVisualizer {
    static visualize(trace) {
        return trace.steps.map((s, i) => `Step ${i + 1}: ${s.name}\n  Desc: ${s.description}\n  In : ${s.input}\n  Out: ${s.output}`).join('\n---\n');
    }
}
exports.StepByStepVisualizer = StepByStepVisualizer;
