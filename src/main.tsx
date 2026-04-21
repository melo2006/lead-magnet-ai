import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Root ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: "#fff", background: "#0a0f1a", minHeight: "100vh" }}>
          <h1 style={{ color: "#f87171" }}>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 16, color: "#94a3b8" }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: "10px 20px", background: "#10b981", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
