import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProfileEditor from "./ProfileEditor";
export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return <main style={{ minHeight: "100svh", background: "#000" }}><header style={{ borderBottom: "1px solid #262626", padding: "18px 24px" }}><a href="/account" style={{ color: "#fff", textDecoration: "none", fontWeight: 700 }}>OCodeJS. / Account</a></header><ProfileEditor /></main>;
}
