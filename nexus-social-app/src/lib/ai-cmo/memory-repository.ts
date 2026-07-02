/**
 * Backward-compatible barrel — canonical implementation in memory/memory-repository.ts
 */

export {
  MemoryRepository,
  memoryRepository,
  memoryRepositoryUtils,
} from '@/lib/ai-cmo/memory/memory-repository';

export type {
  GetOutcomesInput,
  IMemoryRepository,
  LearningRecord,
  MemoryQueryParams,
  MemoryResult,
  MemoryResultSource,
  OutcomeRecord,
  RetrieveMemoryInput,
} from '@/lib/ai-cmo/memory/types';
