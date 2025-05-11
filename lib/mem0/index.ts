import { config } from 'dotenv';
import { Memory } from 'mem0ai/oss';

config({
  path: '.env.local',
});

export const memory = new Memory({
    version: 'v1.1',
    embedder: {
      provider: 'google',
      config: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        model: 'text-embedding-004',
      },
    },
    vectorStore: {
      provider: 'redis',
      config: {
        collectionName: 'memories',
        embeddingModelDims: 768,
        redisUrl: process.env.MEM0_REDIS_URL,
        username: process.env.MEM0_REDIS_USERNAME,
        password: process.env.MEM0_REDIS_PASSWORD,
      },
    },
    llm: {
      provider: 'google',
      config: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        model: 'gemini-2.5-flash-preview-04-17',
      },
    },
    historyStore: {
      provider: 'supabase',
      config: {
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseKey: process.env.SUPABASE_KEY || '',
        tableName: 'memory_history',
      },
    },
    disableHistory: false, // This is false by default
  });
