import EventEmitter from "node:events";
import { EventPayloads } from "./types/events.types";

class AppEventEmitter extends EventEmitter {
    emit<K extends keyof EventPayloads>(
        eventName: K,
        payload: EventPayloads[K]): boolean {
        return super.emit(eventName, payload);
    }

    on<K extends keyof EventPayloads>(
        eventName: K,
        listener: (payload: EventPayloads[K]) => void): this {
        return super.on(eventName, listener)
    }

    off<K extends keyof EventPayloads>(
        eventName: K,
        listener: (payload: EventPayloads[K]) => void): this {
        return super.off(eventName, listener)
    }

    once<K extends keyof EventPayloads>(
        eventName: K,
        listener: (payload: EventPayloads[K]) => void): this {
        return super.once(eventName, listener)
    }
}
const eventEmitter = new AppEventEmitter();
export default eventEmitter;