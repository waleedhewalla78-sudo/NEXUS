export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { verifyEnv } = await import('./lib/verify-env');
    verifyEnv();

    const { sdk } = await import('./lib/opentelemetry');
    sdk.start();
  }
}
