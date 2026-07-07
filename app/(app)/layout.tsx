import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="flex-1 md:ml-[280px] min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
