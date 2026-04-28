import { redirect } from "next/navigation";

/** Root → redirect to tenant list (middleware handles auth gate). */
export default function RootPage() {
  redirect("/tenants");
}
