export interface ApprovalProvider {
  request(toolName: string, argsSummary: string): Promise<"yes" | "no" | "always">;
}

export type EventType =
  | { type: "agent:thinking" }
  | { type: "agent:message"; content: string }
  | { type: "tool:call"; name: string; args: any }
  | { type: "tool:diff"; before: string; after: string }
  | { type: "tool:result"; ok: boolean; output: string }
  | { type: "system:message"; message: string }
  | { type: "system:error"; message: string };

export class EventBus {
  private listeners: ((event: EventType) => void)[] = [];

  subscribe(listener: (event: EventType) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(event: EventType) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
