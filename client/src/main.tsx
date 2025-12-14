import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
const path = window.location.pathname;

// Policy pages load instantly without AuthProvider or query dependencies
if (path === '/security' || path === '/privacy' || path === '/terms' || path === '/faq') {
  // Dynamic import to avoid loading App bundle
  const loadPolicyPage = async () => {
    if (path === '/security') {
      const { default: SecurityPage } = await import("./pages/security");
      root.render(<SecurityPage />);
    } else if (path === '/privacy') {
      const { default: PrivacyPage } = await import("./pages/privacy");
      root.render(<PrivacyPage />);
    } else if (path === '/terms') {
      const { default: TermsPage } = await import("./pages/terms");
      root.render(<TermsPage />);
    } else if (path === '/faq') {
      const { default: FAQPage } = await import("./pages/faq");
      root.render(<FAQPage />);
    }
  };
  loadPolicyPage();
} else {
  // Load full app with all providers for other routes
  import("./App").then(({ default: App }) => {
    root.render(<App />);
  });
}
