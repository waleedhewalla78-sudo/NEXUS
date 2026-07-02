import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  CANNIBALIZATION_SIMILARITY_THRESHOLD,
  UniquenessGuard,
} from '@/lib/ai-cmo/quality/uniqueness-guard';

function hashTextToVector(text: string, dimensions = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i += 1) {
    vector[i % dimensions] += text.charCodeAt(i) / 255;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

describe('uniqueness guard', () => {
  it('detects high similarity between near-duplicate captions', () => {
    const text =
      'Transform your marketing with AI-powered automation and smarter campaign workflows today.';
    const duplicate =
      'Transform your marketing with AI-powered automation and smarter campaign workflows today!';

    const similarity = cosineSimilarity(
      hashTextToVector(text.toLowerCase()),
      hashTextToVector(duplicate.toLowerCase()),
    );

    expect(similarity).toBeGreaterThan(CANNIBALIZATION_SIMILARITY_THRESHOLD);
  });

  it('returns unique for empty content via check', async () => {
    const guard = new UniquenessGuard();
    const result = await guard.check('', '550e8400-e29b-41d4-a716-446655440000');
    expect(result.isUnique).toBe(true);
    expect(result.similarityScore).toBe(0);
  });

  it('builds cannibalization warning when not unique', () => {
    const guard = new UniquenessGuard();
    const warning = guard.toWarning({
      isUnique: false,
      similarityScore: 0.85,
      conflictingPostId: 'post-1',
      source: 'postgres',
      checkedAgainst: 10,
    });

    expect(warning?.code).toBe('CANNIBALIZATION_DETECTED');
    expect(warning?.message).toContain('85%');
  });
});
