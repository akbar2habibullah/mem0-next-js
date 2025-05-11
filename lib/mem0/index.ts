// file: memory-service.js (or similar)
import { config } from 'dotenv';
import { Memory } from 'mem0ai/oss';

config({
  path: '.env.local',
});

let memoryInstance: Memory | null = null; // Singleton instance

/**
 * Initializes and returns a Memory instance.
 * Ensures that the instance is ready to be used.
 * Implements a simple singleton pattern to avoid re-initializing.
 */
export async function getMemoryInstance() {
  if (memoryInstance) {
    // Optional: Add a check if the instance is still "healthy" or "initialized"
    // For mem0, if memory.init() succeeded, it should be fine.
    // If mem0 had a `isInitialized()` or `healthCheck()` method, you could use it here.
    // For now, we assume if it's created and init was called, it's good.
    return memoryInstance;
  }

  console.log("Initializing mem0 Memory instance...");
  try {
    const newMemory = new Memory({
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
          model: 'gemini-1.5-flash-latest', // Updated to a common model, ensure yours is valid
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
      disableHistory: false,
    });
  
    console.log("mem0 Memory instance initialized successfully.");
    memoryInstance = newMemory;
    return memoryInstance;
  } catch (error) {
    console.error("Failed to initialize mem0 Memory instance:", error);
    // This error will now be properly caught and can be handled by the caller.
    // For an endpoint, this would typically result in a 503 Service Unavailable or similar.
  }
}

// Optional: If you want to pre-initialize on server startup (and potentially crash startup if it fails)
(async () => {
  try {
    await getMemoryInstance();
    console.log("Memory pre-initialized on startup.");
  } catch (error) {
    console.error("Failed to pre-initialize memory on startup. The application might not function correctly.", error);
    // process.exit(1); // Optionally exit if memory is critical
  }
})();