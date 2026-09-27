import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getUser()) redirect("/");
  return (
    <main className="auth">
      <div className="auth-card">
        <Logo size={40} />
        <LoginForm />
        <p className="auth-foot">Greecon shpk · Durana Tech Park, Shijak · greecon.earth</p>
      </div>
    </main>
  );
}
