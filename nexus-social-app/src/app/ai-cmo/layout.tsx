import { AiCmoNav } from './AiCmoNav';

export default function AiCmoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AiCmoNav />
      {children}
    </div>
  );
}
