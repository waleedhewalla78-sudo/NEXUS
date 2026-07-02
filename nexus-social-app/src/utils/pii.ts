/** Simple regex to redact emails and phone numbers */
export function redactPII(text: string): string {
  // Redact email addresses
  const emailRedacted = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED EMAIL]');
  // Redact phone numbers (basic patterns)
  const phoneRedacted = emailRedacted.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');
  return phoneRedacted;
}
