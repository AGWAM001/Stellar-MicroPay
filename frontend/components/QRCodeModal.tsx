/**
 * components/QRCodeModal.tsx
 * Modal component for displaying QR code with Stellar payment URI (SEP-0007).
 */

import { useEffect, useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string;
  amount?: string;
}

export default function QRCodeModal({ isOpen, onClose, publicKey, amount }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Generate SEP-0007 URI format: web+stellar:pay?destination=G...[&amount=X]
  const generateStellarURI = () => {
    const baseURI = `web+stellar:pay?destination=${publicKey}`;
    if (amount && parseFloat(amount) > 0) {
      return `${baseURI}&amount=${amount}`;
    }
    return baseURI;
  };

  const stellarURI = generateStellarURI();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeElement = document.activeElement;
    returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;

    const focusFirstElement = () => {
      const focusable = getFocusableElements(dialogRef.current);
      const target = focusable[0] ?? closeButtonRef.current ?? dialogRef.current;
      target?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (!current || !dialogRef.current?.contains(current) || current === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!current || !dialogRef.current?.contains(current) || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const frame = window.requestAnimationFrame(focusFirstElement);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);

      const target = returnFocusRef.current;
      if (target) {
        window.setTimeout(() => target.focus(), 0);
      }
    };
  }, [isOpen, onClose]);

  // Download QR code as PNG
  const downloadQRCode = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `stellar-qr-${publicKey.slice(0, 8)}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="card max-w-md w-full animate-slide-up outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-code-modal-title"
        aria-describedby="qr-code-modal-description"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 id="qr-code-modal-title" className="font-display text-xl font-semibold text-white">
            Receive Payment QR Code
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close QR code modal"
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
            <QRCodeCanvas
              value={stellarURI}
              size={256}
              level="M"
              includeMargin={true}
              ref={canvasRef}
            />
          </div>
          
          {/* Address Display */}
          <div className="text-center mb-4">
            <p className="text-xs text-slate-400 mb-1">Your Stellar Address</p>
            <p className="font-mono text-sm text-slate-300 break-all">
              {publicKey}
            </p>
          </div>

          {/* URI Display */}
          <div className="text-center mb-6">
            <p className="text-xs text-slate-400 mb-1">Payment URI</p>
            <p className="font-mono text-xs text-slate-400 break-all max-w-full">
              {stellarURI}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={downloadQRCode}
            className="flex-1 bg-stellar-500 hover:bg-stellar-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <DownloadIcon className="w-4 h-4" />
            Download QR
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <p id="qr-code-modal-description" className="text-xs text-slate-400 text-center">
            Scan this QR code with Freighter mobile or any Stellar wallet to receive payments.
          </p>
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null) {
  if (!root) {
    return [];
  }

  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
