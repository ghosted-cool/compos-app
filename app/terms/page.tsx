import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Terms of Service — Compos",
  description: "Terms of Service for the Compos personal organization app.",
};

export default function TermsPage() {
  return (
    <main className="flex-1 bg-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <Image src="/logo.png" alt="Compos" width={36} height={36} className="object-contain" />
          <span className="text-lg font-semibold">Compos</span>
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-ink-soft mb-10">Last updated: July 5, 2026</p>

        <div className="space-y-8 text-[15px] leading-7 text-ink">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. What Compos is</h2>
            <p>
              Compos is a private, invitation-only personal organization app operated by Gabriele
              Acquaroli. It provides task and project management, an AI chat assistant, a
              whiteboard, Google Calendar sync, budgeting tools and simple sharing between users. It
              is provided free of charge as a personal project, not as a commercial service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Accounts</h2>
            <p>
              You sign in with your Google account. You are responsible for the content you create
              in Compos and for keeping access to your Google account secure. Access may be granted
              or revoked at the operator&apos;s discretion, since this is a private app for a small
              group.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Your content</h2>
            <p>
              You own everything you create in Compos — tasks, projects, chats, boards, expenses and
              budgets. You grant Compos only the technical permission needed to store and display
              that content back to you and to anyone you explicitly share it with. See the{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
              for how data is handled.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. AI assistant</h2>
            <p>
              The built-in chat uses Anthropic&apos;s Claude models. Responses are generated
              automatically and may be inaccurate — don&apos;t rely on them as professional advice.
              Chat is limited to 10 requests per user per rolling 24-hour period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Google Calendar</h2>
            <p>
              If you grant the calendar permission, Compos will read your events to display them in
              the app and create events you add from the app. You can revoke this permission at any
              time from your Google account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Acceptable use</h2>
            <p>
              Don&apos;t use Compos to store or share unlawful content, attempt to access other
              users&apos; data, or interfere with the service&apos;s operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Availability and warranty</h2>
            <p>
              Compos is provided &quot;as is&quot;, without warranties of any kind. As a personal
              project it may be modified, interrupted or discontinued at any time. To the maximum
              extent permitted by law, the operator is not liable for any damages arising from use
              of the service. If the service shuts down, reasonable effort will be made to give
              users a chance to export their data first.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Termination</h2>
            <p>
              You can stop using Compos at any time and request deletion of your data (see the
              Privacy Policy). The operator may suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:acquaroligabriele@gmail.com" className="text-primary hover:underline">
                acquaroligabriele@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-outline-soft text-sm text-ink-soft flex gap-4">
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          <Link href="/" className="text-primary hover:underline">Back to Compos</Link>
        </div>
      </div>
    </main>
  );
}
