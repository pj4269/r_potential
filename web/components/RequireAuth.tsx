"use client";

import React from "react";
import {
  Authenticator,
  useAuthenticator,
} from "@aws-amplify/ui-react";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authStatus, signOut, user } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
  ]);

  // Login / signup screen
  if (authStatus !== "authenticated") {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white">
              Welcome R-Potential team!
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Sign in to access the financial analytics platform
            </p>
          </div>

          <Authenticator loginMechanisms={["email"]} />
        </div>
      </main>
    );
  }

  // Authenticated application
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {user?.signInDetails?.loginId ?? "Signed in"}
        </div>

        <button
          onClick={signOut}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>

      {children}
    </div>
  );
}
