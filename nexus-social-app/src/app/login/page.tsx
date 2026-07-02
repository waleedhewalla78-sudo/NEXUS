import LoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect?.startsWith('/') ? params.redirect : '/';

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-8">
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
