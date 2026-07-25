import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import QRCodeModal from "@/components/QRCodeModal";

jest.mock("qrcode.react", () => {
  const React = require("react");

  return {
    QRCodeCanvas: React.forwardRef<HTMLCanvasElement, Record<string, unknown>>((_, ref) => (
      <canvas ref={ref} data-testid="qr-code-canvas" />
    )),
    QRCodeSVG: () => <svg data-testid="qr-code-svg" />,
  };
});

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open modal
      </button>
      <QRCodeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        publicKey="GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567"
      />
    </div>
  );
}

describe("QRCodeModal", () => {
  it("traps focus, closes on Escape, and returns focus to the opener", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const opener = screen.getByRole("button", { name: "Open modal" });
    await user.click(opener);

    const closeButton = await screen.findByRole("button", { name: "Close QR code modal" });
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /Download QR/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: /^Close$/i })).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });
});
