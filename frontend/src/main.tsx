import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { ToastProvider } from "./hooks/useToast.tsx";
import { ProfileProvider } from "./hooks/useProfile.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
