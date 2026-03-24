import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-6 h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
