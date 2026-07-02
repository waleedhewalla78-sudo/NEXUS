/**
 * Lightweight sentiment classifier.
 * In a full production environment, this calls a fast, specialized LLM (like Claude Haiku or GPT-4o-mini).
 */
export async function classifySentiment(text: string): Promise<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'URGENT'> {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('cancel') || lowerText.includes('refund') || lowerText.includes('lawyer') || lowerText.includes('angry') || lowerText.includes('worst')) {
    return 'URGENT';
  }
  
  if (lowerText.includes('bad') || lowerText.includes('poor') || lowerText.includes('broken') || lowerText.includes('hate')) {
    return 'NEGATIVE';
  }

  if (lowerText.includes('great') || lowerText.includes('love') || lowerText.includes('awesome') || lowerText.includes('good') || lowerText.includes('thanks')) {
    return 'POSITIVE';
  }

  return 'NEUTRAL';
}
