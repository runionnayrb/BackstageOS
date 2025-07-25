import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile-pwa.css";

// Force white background on document load
document.documentElement.style.backgroundColor = '#ffffff';
document.body.style.backgroundColor = '#ffffff';

createRoot(document.getElementById("root")!).render(<App />);
