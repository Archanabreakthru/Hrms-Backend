"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventBus = void 0;
exports.createEvent = createEvent;
const crypto_1 = __importDefault(require("crypto"));
class InMemoryEventBus {
    handlers = new Map();
    async publish(routingKey, event) {
        const subscribers = this.handlers.get(routingKey) || [];
        for (const handler of subscribers) {
            try {
                await handler(event);
            }
            catch (err) {
                console.error(`[EventBus] Error handling event ${event.eventType} on ${routingKey}:`, err);
            }
        }
    }
    subscribe(routingKey, handler) {
        const list = this.handlers.get(routingKey) || [];
        list.push(handler);
        this.handlers.set(routingKey, list);
    }
}
exports.InMemoryEventBus = InMemoryEventBus;
function createEvent(eventType, aggregateId, aggregateType, payload, correlationId) {
    return {
        eventId: crypto_1.default.randomUUID(),
        eventType,
        aggregateId,
        aggregateType,
        timestamp: new Date().toISOString(),
        payload,
        correlationId,
    };
}
