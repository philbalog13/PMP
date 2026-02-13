export interface ICommand {
    execute(payload: unknown): Promise<unknown>;
}
