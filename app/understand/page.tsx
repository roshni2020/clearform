import type { Metadata } from "next";
import { UnderstandClient } from "./UnderstandClient";

export const metadata: Metadata = { title: "Understand a Document — ClearForm" };

export default function UnderstandPage() {
  return <UnderstandClient />;
}
