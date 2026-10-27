import { Logo } from "@/components/brand";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-10" />
      <p className="text-6xl font-semibold tracking-tight text-accent-text">404</p>
      <h1 className="mt-3 text-xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-ink-2">Cette page n&apos;existe pas ou a été déplacée.</p>
      <LinkButton href="/" className="mt-8">
        Retour à l&apos;accueil
      </LinkButton>
    </div>
  );
}
