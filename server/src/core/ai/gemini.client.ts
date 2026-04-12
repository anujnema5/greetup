import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "@/shared/config/config";

let client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return client;
}
