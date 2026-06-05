import type { Message, MessageType } from "../types/chat.types";

const TYPE_LABELS: Record<Exclude<MessageType, "text" | "system">, string> = {
  image: "Photo",
  video: "Video",
  file: "File",
  voice: "Voice message",
  gif: "GIF",
};

export function messageToastPreview(message: Pick<Message, "content" | "messageType">): string {
  if (message.messageType === "text") {
    const text = message.content.trim();
    if (!text) return "New message";
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  if (message.messageType === "system") return "New activity";
  return TYPE_LABELS[message.messageType] ?? "New message";
}

export function messageSenderLabel(
  sender: Message["sender"] | undefined,
  fallback = "Someone",
): string {
  const name = sender?.displayName?.trim() || sender?.name?.trim();
  return name || fallback;
}
