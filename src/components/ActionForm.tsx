"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

export function ActionForm({
  action, submit, children, className = "form-grid", resetOnSuccess = true, confirm, buttonClass
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  submit: string;
  children?: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  buttonClass?: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  // Submit manually: React's built-in form actions reset the fields even when the action fails.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => run(data));
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <form ref={ref} className={className} onSubmit={onSubmit}>
        {children}
        <div><button type="submit" className={buttonClass} disabled={pending}>{pending ? "Saving…" : submit}</button></div>
      </form>
      {state.error && <div className="notice error" role="alert">{state.error}</div>}
      {state.ok && !state.secret && <div className="notice success" role="status">{state.ok}</div>}
      {state.secret && (
        <div className="secret" role="status">
          <div className="small" style={{ marginBottom: 6 }}>{state.ok} Copy it now — it will not be shown again.</div>
          <code>{state.secret}</code>
        </div>
      )}
    </div>
  );
}
