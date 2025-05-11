import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { google } from '@ai-sdk/google';

export const myProvider = customProvider({
      languageModels: {
        'chat-model': google('gemini-2.5-flash-preview-04-17'),
        'mbak-ai': google('gemini-2.5-flash-preview-04-17'),
        'title-model': google('gemini-2.0-flash-lite'),
        'artifact-model': google('gemini-2.5-flash-preview-04-17'),
      }
    });
