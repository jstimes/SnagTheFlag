
export enum LogType {
    TARGET_FINDING = 'Targets',
    AI = 'AI',
    ACTIONS = 'Actions',
}

class Logger {
    logTypeToIsLogging: Map<LogType, boolean> = new Map([
        [LogType.TARGET_FINDING, false],
        [LogType.AI, true],
        [LogType.ACTIONS, false],
    ]);
    logTypeToLogs: Map<LogType, string[]>;

    constructor() {
        this.logTypeToLogs = new Map([
            [LogType.ACTIONS, []],
            [LogType.AI, []],
            [LogType.TARGET_FINDING, []],
        ]);
    }

    log(type: LogType, log: string): void {
        this.logTypeToLogs.get(type)!.push(log);
        if (this.logTypeToIsLogging.get(type)!) {
            console.log(log);
        }
    }
}

export const LOGGER = new Logger();