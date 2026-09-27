"use client";

import { startTransition, useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form onSubmit={(e) => {
      // Manual submit keeps the email filled in after a failed attempt.
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      startTransition(() => action(data));
    }}>
      <h1 style={{ fontSize: 20 }}>Sign in</h1>
      {state.error && <div className="notice error" role="alert">{state.error}</div>}
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
