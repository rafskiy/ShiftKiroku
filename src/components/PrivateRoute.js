// src/components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <p>Loading...</p>;

  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // Logged in, allow access
  return children;
}
