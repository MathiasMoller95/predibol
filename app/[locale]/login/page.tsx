import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-dark-900 px-4 py-10">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8">
            <div className="h-8 w-48 animate-pulse rounded bg-dark-700" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-dark-700" />
            <div className="mt-6 h-10 w-full animate-pulse rounded bg-dark-700" />
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
