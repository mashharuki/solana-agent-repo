import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./css/index.css";
import { WalletGate } from "./components/wallet/WalletGate.tsx";
import { SolanaProvider } from "./providers/SolanaProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SolanaProvider>
      <WalletGate>
        <App />
      </WalletGate>
    </SolanaProvider>
  </StrictMode>,
);
