import { redirect } from "next/navigation";

// URL lama — dialih ke /admin/agm/tugasan.
export default function GerakKerjaRedirect() {
  redirect("/admin/agm/tugasan");
}
