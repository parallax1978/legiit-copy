import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Terms" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-10 text-3xl font-bold text-ink">Terms of service</h1>
      <p className="mt-4 text-sm text-ink-muted">This page is a placeholder for the Legiit Copy terms of service and will be replaced with the reviewed legal text before launch. Legiit Copy is a Legiit product.</p>
    </main>
  );
}
