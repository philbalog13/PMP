export interface ICommand {
    execute(payload: any): Promise<any>;
}
