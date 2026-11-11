import crypto from 'crypto';

export interface MessageBrokerOptions {
  url?: string;
  exchangeName?: string;
}

export interface EventPublisher {
  publish<T>(routingKey: string, event: import('../contracts/events').DomainEvent<T>): Promise<void>;
}

export class InMemoryEventBus implements EventPublisher {
  private handlers = new Map<string, Array<(event: any) => Promise<void>>>();

  async publish<T>(routingKey: string, event: import('../contracts/events').DomainEvent<T>): Promise<void> {
    const subscribers = this.handlers.get(routingKey) || [];
    for (const handler of subscribers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${event.eventType} on ${routingKey}:`, err);
      }
    }
  }

  subscribe<T>(routingKey: string, handler: (event: import('../contracts/events').DomainEvent<T>) => Promise<void>): void {
    const list = this.handlers.get(routingKey) || [];
    list.push(handler);
    this.handlers.set(routingKey, list);
  }
}

export function createEvent<T>(
  eventType: string,
  aggregateId: string,
  aggregateType: string,
  payload: T,
  correlationId?: string
): import('../contracts/events').DomainEvent<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    aggregateId,
    aggregateType,
    timestamp: new Date().toISOString(),
    payload,
    correlationId,
  };
}

