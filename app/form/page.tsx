import type { Metadata } from "next";
import { Suspense } from "react";
import { FormClient } from "./FormClient";

export const metadata: Metadata = { title: "Complete a Form — ClearForm" };

export default function FormPage() {
  return (
    <Suspense fallback={<div className="container section-tight">Loading…</div>}>
      <FormClient />
    </Suspense>
  );
}
