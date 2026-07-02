// INSTALL: npm install langfuse
/**
 * Feature 004 — Langfuse trace wrapper with PII scrubbing (AI Ops visibility).
 * Does not replace 003 Sentry logging — 004 agents opt in via createAiCmoTrace().
 *
 * [SPEC]
 * - Scrub emails and phone numbers from trace input/output/metadata before export
 * - Fail gracefully when Langfuse package or keys missing
 * - Trace names prefixed `ai-cmo/` for namespace isolation
 */

export type LangfuseConfig = {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  enabled: boolean;
};

export type CreateAiCmoTraceParams = {
  name: string;
  workspaceId: string;
  userId?: string;
  sessionId?: string;
  input?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
};

export type AiCmoTraceHandle = {
  id: string;
  end: (output?: unknown) => Promise<void>;
  event: (name: string, metadata?: Record<string, unknown>) => void;
  isStub: boolean;
};

const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN =
  /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g;

const REDACTED = '[REDACTED_PII]';

export function scrubPiiFromText(text: string): string {
  return text.replace(EMAIL_PATTERN, REDACTED).replace(PHONE_PATTERN, REDACTED);
}

export function scrubPiiFromValue(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return scrubPiiFromText(value);
  }

  if (Array.isArray(value)) {
    return value.map(scrubPiiFromValue);
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = scrubPiiFromValue(nested);
    }
    return out;
  }

  return value;
}

export function resolveLangfuseConfig(): LangfuseConfig {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com';

  return {
    publicKey,
    secretKey,
    baseUrl,
    enabled: Boolean(publicKey && secretKey),
  };
}

function createStubTrace(params: CreateAiCmoTraceParams): AiCmoTraceHandle {
  const id = `ai-cmo-stub-${Date.now()}`;
  const scrubbedInput = scrubPiiFromValue(params.input);

  return {
    id,
    isStub: true,
    event(name, metadata) {
      console.debug('[langfuse-stub]', params.name, name, scrubPiiFromValue(metadata));
    },
    async end(output) {
      console.debug('[langfuse-stub] end', params.name, {
        workspaceId: params.workspaceId,
        input: scrubbedInput,
        output: scrubPiiFromValue(output),
      });
    },
  };
}

function loadLangfuseConstructor(): (new (opts: {
  publicKey: string;
  secretKey: string;
  baseUrl?: string;
}) => {
  trace: (opts: {
    name: string;
    userId?: string;
    sessionId?: string;
    input?: unknown;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => {
    id: string;
    update: (opts: { output?: unknown }) => void;
    event: (opts: { name: string; metadata?: Record<string, unknown> }) => void;
  };
}) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('langfuse') as {
      Langfuse: new (opts: {
        publicKey: string;
        secretKey: string;
        baseUrl?: string;
      }) => {
        trace: (opts: {
          name: string;
          userId?: string;
          sessionId?: string;
          input?: unknown;
          metadata?: Record<string, unknown>;
          tags?: string[];
        }) => {
          id: string;
          update: (opts: { output?: unknown }) => void;
          event: (opts: { name: string; metadata?: Record<string, unknown> }) => void;
        };
      };
    };
    return mod.Langfuse;
  } catch {
    return null;
  }
}

let cachedLangfuse: InstanceType<NonNullable<ReturnType<typeof loadLangfuseConstructor>>> | null =
  null;

function getLangfuseInstance(): InstanceType<
  NonNullable<ReturnType<typeof loadLangfuseConstructor>>
> | null {
  const config = resolveLangfuseConfig();
  if (!config.enabled || !config.publicKey || !config.secretKey) {
    return null;
  }

  if (cachedLangfuse) {
    return cachedLangfuse;
  }

  const LangfuseCtor = loadLangfuseConstructor();
  if (!LangfuseCtor) {
    return null;
  }

  cachedLangfuse = new LangfuseCtor({
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    baseUrl: config.baseUrl,
  });

  return cachedLangfuse;
}

export function createAiCmoTrace(params: CreateAiCmoTraceParams): AiCmoTraceHandle {
  const traceName = params.name.startsWith('ai-cmo/') ? params.name : `ai-cmo/${params.name}`;
  const scrubbedInput = scrubPiiFromValue(params.input);
  const scrubbedMetadata = scrubPiiFromValue(params.metadata ?? {}) as Record<string, unknown>;

  const langfuse = getLangfuseInstance();
  if (!langfuse) {
    return createStubTrace({ ...params, name: traceName, input: scrubbedInput });
  }

  const trace = langfuse.trace({
    name: traceName,
    userId: params.userId,
    sessionId: params.sessionId ?? params.workspaceId,
    input: scrubbedInput,
    metadata: {
      ...scrubbedMetadata,
      workspaceId: params.workspaceId,
      feature: '004-ai-cmo',
    },
    tags: params.tags ?? ['ai-cmo', 'feature-004'],
  });

  return {
    id: trace.id,
    isStub: false,
    event(name, metadata) {
      trace.event({
        name,
        metadata: scrubPiiFromValue(metadata ?? {}) as Record<string, unknown>,
      });
    },
    async end(output) {
      trace.update({ output: scrubPiiFromValue(output) });
    },
  };
}

export function resetLangfuseClientForTests(): void {
  cachedLangfuse = null;
}

export const langfuseClientUtils = {
  scrubPiiFromText,
  scrubPiiFromValue,
  createAiCmoTrace,
  resolveLangfuseConfig,
};
