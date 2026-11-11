export interface DomainEvent<T = any> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  payload: T;
  correlationId?: string;
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: string; // JSON stringified
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  processedAt?: Date;
}

