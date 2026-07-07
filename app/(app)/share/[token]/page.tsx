"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { createClient } from "@/lib/supabase/client";

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const { data, error } = await supabase.rpc("redeem_share", { p_token: token });
      if (error || !data?.[0]) {
        setFailed(true);
        return;
      }
      const { kind, resource_id } = data[0] as { kind: string; resource_id: string };
      if (kind === "project") {
        router.replace(`/projects/${resource_id}`);
      } else {
        router.replace(`/brainstorm?board=${resource_id}`);
      }
    })();
  }, [supabase, token, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      {failed ? (
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-soft">link_off</span>
          <p className="text-ink-soft mt-2">{t("sharePage.invalid")}</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            {t("common.goHome")}
          </Link>
        </div>
      ) : (
        <p className="text-ink-soft text-sm">{t("sharePage.opening")}</p>
      )}
    </div>
  );
}
