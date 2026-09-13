"use client";

import React from "react";
import {
  Authenticator,
  ThemeProvider,
} from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

const theme = {
  name: "financial-theme",

  tokens: {
    colors: {
      brand: {
        primary: {
          10: "#e2e8f0",
          20: "#cbd5e1",
          40: "#94a3b8",
          60: "#64748b",
          80: "#334155",
          90: "#1e293b",
          100: "#0f172a",
        },
      },
    },
  },
};

export function AmplifyAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <Authenticator.Provider>
        {children}
      </Authenticator.Provider>
    </ThemeProvider>
  );
}
