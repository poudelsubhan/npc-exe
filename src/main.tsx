import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Workshop } from "./Workshop";
import "./styles.css";
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* UI error details are kept out of the rendered page. */
  }
  render() {
    return this.state.failed ? (
      <main className="workshop-page">
        <h1>The world needs a moment.</h1>
        <p>The interface could not load. Your running journey stays on the server.</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          Reload the view
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <ErrorBoundary>{window.location.pathname === "/workshop" ? <Workshop /> : <App />}</ErrorBoundary>,
);
