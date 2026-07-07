import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Privacy Policy — Compos",
  description: "How Compos collects, stores and uses your data.",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-surface">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <Image src="/logo.png" alt="Compos" width={36} height={36} className="object-contain" />
          <span className="text-lg font-semibold">Compos</span>
        </Link>

        <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink-soft mb-10">Last updated: July 5, 2026</p>

        <div className="space-y-8 text-[15px] leading-7 text-ink">
          <section>
            <h2 className="text-xl font-semibold mb-2">Who we are</h2>
            <p>
              Compos is a personal organization application operated by Gabriele Acquaroli. This
              product is currently in Beta Testing Mode. For any questions or requests, write at{" "}
              <a href="mailto:contact@ghosted.cool" className="text-primary hover:underline">
                contact@ghosted.cool
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Data we collect and store</h2>
            <p className="mb-3">
              When you sign in with Google and use Compos, we store the following data in our
              database (hosted on Supabase):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account information:</strong> your name, email address and profile picture
                as provided by Google Sign-In.
              </li>
              <li>
                <strong>Tasks and projects:</strong> the to-do items, task lists, priorities, due
                dates and project details you create in the app.
              </li>
              <li>
                <strong>Google Calendar tokens:</strong> OAuth access and refresh tokens that let
                Compos read and create events in your Google Calendar. These tokens are stored
                encrypted (AES-256-GCM) and are used exclusively to sync calendar events inside the
                app.
              </li>
              <li>
                <strong>Chat messages:</strong> conversations you have with the built-in AI
                assistant, so you can revisit them later.
              </li>
              <li>
                <strong>Spending entries and budgets:</strong> the expense amounts, categories,
                notes and monthly budget figures you enter on the Budget page.
              </li>
              <li>
                <strong>Whiteboard content:</strong> the drawings, shapes, text and images you place
                on Brainstorm boards.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How we use your data</h2>
            <p>
              Your data is used solely to provide Compos&apos;s features to you: showing your tasks
              and projects, syncing your calendar, tracking your budget, saving your whiteboards and
              keeping your chat history. We do not use your data for advertising, profiling,
              analytics resale or model training.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Google user data</h2>
            <p className="mb-3">
              Compos requests the <code className="font-mono text-sm">profile</code>,{" "}
              <code className="font-mono text-sm">email</code> and{" "}
              <code className="font-mono text-sm">https://www.googleapis.com/auth/calendar.events</code>{" "}
              scopes. Google Calendar data is used only to display your events inside the Compos
              calendar and to create or update events you explicitly add from the app. It is never
              shared with any third party, never used for any other purpose, and never used to train
              AI or machine-learning models.
            </p>
            <p>
              Compos&apos;s use and transfer of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Sharing with third parties</h2>
            <p className="mb-3">
              We do not sell, rent or share your personal data with third parties. The only parties
              that process data on our behalf are the infrastructure providers required to run the
              app:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase</strong> — database and authentication hosting.</li>
              <li><strong>Vercel</strong> — application hosting.</li>
              <li>
                <strong>Anthropic</strong> — when you send a message to the AI chat, the text of
                that conversation is sent to Anthropic&apos;s API to generate a reply. Your calendar
                data, tokens and spending entries are not sent to Anthropic.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Sharing you control</h2>
            <p>
              If you share a Project or Brainstorm board with another Compos user by link or email
              invite, that person can see (and, if you grant edit permission, modify) the content of
              that specific project or board. You can revoke a share at any time from the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Data retention and deletion</h2>
            <p>
              Your data is kept for as long as you have an account. You can delete individual items
              (tasks, chats, expenses, boards) at any time from the app. To delete your account and
              all associated data — including stored Google Calendar tokens — email{" "}
              <a href="mailto:acquaroligabriele@gmail.com" className="text-primary hover:underline">
                acquaroligabriele@gmail.com
              </a>{" "}
              and it will be removed within 30 days. You can also revoke Compos&apos;s access to
              your Google account at any time at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              , which immediately invalidates the stored tokens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Security</h2>
            <p>
              All traffic is encrypted in transit with TLS. Google Calendar tokens are encrypted at
              rest with AES-256-GCM before being written to the database. Database access is
              protected by row-level security so each user can only read and write their own data
              (plus content explicitly shared with them).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes to this policy</h2>
            <p>
              If this policy changes, the updated version will be posted at this address with a new
              &quot;Last updated&quot; date.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-outline-soft text-sm text-ink-soft flex gap-4">
          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          <Link href="/" className="text-primary hover:underline">Back to Compos</Link>
        </div>
      </div>
    </main>
  );
}
