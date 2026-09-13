"use client";

import React from "react";
import "../lib/amplify-config";

import { AmplifyAuthProvider } from "../components/AmplifyAuthProvider";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AmplifyAuthProvider>
      {children}
    </AmplifyAuthProvider>
  );
}
