import { AbstractRule } from './AbstractRule';
export declare class ApproveRule extends AbstractRule {
    id: string;
    name: string;
    description: string;
    priority: number;
    category: "CUSTOM";
    constructor();
    condition: () => boolean;
}
//# sourceMappingURL=ApproveRule.d.ts.map