'use client';

import { ReactNode, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { getConfig } from './lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import './globals.css';

const queryClient = new QueryClient();

// ─── Match the Weather Options design system ──────────────────────────────────
const weatherTheme = lightTheme({
  accentColor:          '#1c2b1e',   // T.green  — primary action colour
  accentColorForeground:'#f4ede0',   // T.cream  — text on green buttons
  borderRadius:         'none',      // sharp corners everywhere
  fontStack:            'system',    // we'll override via CSS below
  overlayBlur:          'none',
});

// Patch individual token values that lightTheme doesn't expose as args
weatherTheme.colors.connectButtonBackground       = '#f4ede0'; // cream
weatherTheme.colors.connectButtonInnerBackground  = '#f4ede0';
weatherTheme.colors.connectButtonText             = '#1c2b1e'; // green
weatherTheme.colors.connectButtonTextError        = '#7c2d12';
weatherTheme.colors.modalBackground               = '#f4ede0';
weatherTheme.colors.modalBorder                   = 'rgba(28,43,30,0.10)';
weatherTheme.colors.modalText                     = '#1c2b1e';
weatherTheme.colors.modalTextSecondary            = '#6b6560';
weatherTheme.colors.profileForeground             = '#f4ede0';
weatherTheme.colors.menuItemBackground            = '#f4ede0';
weatherTheme.colors.actionButtonBorder            = 'rgba(28,43,30,0.10)';
weatherTheme.colors.actionButtonBorderMobile      = 'rgba(28,43,30,0.10)';
weatherTheme.colors.actionButtonSecondaryBackground = '#f4ede0';
weatherTheme.colors.closeButton                   = '#4a5c4b';
weatherTheme.colors.closeButtonBackground         = 'rgba(28,43,30,0.06)';
weatherTheme.colors.generalBorder                 = 'rgba(28,43,30,0.10)';
weatherTheme.colors.generalBorderDim              = 'rgba(28,43,30,0.06)';
weatherTheme.colors.selectedOptionBorder          = '#c9913d'; // amber accent
weatherTheme.colors.standby                       = '#c9913d';
weatherTheme.fonts.body                           = "'DM Mono', monospace";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <html lang="en">
      <head>
              <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Mono:wght@400;700&display=swap');

      /* ── Connect / account button only — NOT modal internals ── */
      [data-rk] [data-testid="rk-connect-button"],
      [data-rk] [data-testid="rk-account-button"] {
        font-family: 'DM Mono', monospace !important;
        font-size: 0.68rem !important;
        letter-spacing: 0.18em !important;
        text-transform: uppercase !important;
        border-radius: 0 !important;
        border: 1px solid rgba(28,43,30,0.10) !important;
        background: #f4ede0 !important;
        color: #1c2b1e !important;
        box-shadow: none !important;
      }
      [data-rk] [data-testid="rk-connect-button"]:hover,
      [data-rk] [data-testid="rk-account-button"]:hover {
        background: #1c2b1e !important;
        color: #f4ede0 !important;
      }

      /* ── Modal internals — reset to normal, keep DM Mono ── */
      [data-rk] [role="dialog"] button {
        font-family: 'DM Mono', monospace !important;
        letter-spacing: normal !important;
        text-transform: none !important;
        border-radius: 0 !important;
      }

      /* ── Modal shell ── */
      [data-rk] [role="dialog"] {
        border-radius: 0 !important;
        border: 1px solid rgba(28,43,30,0.10) !important;
        box-shadow: 0 8px 32px rgba(28,43,30,0.12) !important;
      }

      /* ── Wallet option rows ── */
      [data-rk] [data-testid="rk-wallet-option"] {
        border-radius: 0 !important;
      }
    `}</style>
      </head>
      <body>
        {mounted ? (
          <WagmiProvider config={getConfig()}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider theme={weatherTheme}>
                {children}
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        ) : (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f4ede0',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(28,43,30,0.4)',
          }}>
            Loading…
          </div>
        )}
      </body>
    </html>
  );
}