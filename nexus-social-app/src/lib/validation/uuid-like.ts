import { z } from 'zod';

/** Postgres UUID strings, including legacy walkthrough workspace IDs. */
export const uuidLikeSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'Invalid UUID format',
  });
