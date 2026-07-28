import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import BatchPaymentForm from "@/components/BatchPaymentForm";

jest.mock("@/lib/stellar", () => ({
  isValidStellarAddress: jest.fn(
    (addr: string) => typeof addr === "string" && addr.startsWith("G") && addr.length === 56
  ),
  buildPaymentTransaction: jest.fn(() =>
    Promise.resolve({ toXDR: () => "mocked-xdr" })
  ),
  submitTransaction: jest.fn(() => Promise.resolve({ hash: "tx-abc123" })),
  STELLAR_MEMO_TEXT_MAX_BYTES: 28,
  STELLAR_MINIMUM_ACCOUNT_BALANCE_XLM: 1,
  truncateMemoText: jest.fn((text: string) => text),
}));

jest.mock("@/lib/wallet", () => ({
  signTransactionWithWallet: jest.fn(() =>
    Promise.resolve({ signedXDR: "signed-xdr", error: null })
  ),
}));

const OWN_KEY   = "GOWN1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567";
const VALID_ADDR = "GDEST234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567";

const defaultProps = {
  publicKey: OWN_KEY,
  xlmBalance: "100",
  onBatchSuccess: jest.fn(),
};

describe("BatchPaymentForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with a single empty recipient row by default", () => {
    render(<BatchPaymentForm {...defaultProps} />);

    expect(screen.getAllByPlaceholderText("G...")).toHaveLength(1);
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
  });

  it("adds a new recipient row when Add recipient is clicked", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Add recipient/i }));

    expect(screen.getAllByPlaceholderText("G...")).toHaveLength(2);
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
  });

  it("removes a recipient row when Remove is clicked", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Add recipient/i }));
    expect(screen.getAllByPlaceholderText("G...")).toHaveLength(2);

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    await user.click(removeButtons[0]);

    expect(screen.getAllByPlaceholderText("G...")).toHaveLength(1);
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
  });

  it("Send batch button is disabled when no row has a valid address and amount", () => {
    render(<BatchPaymentForm {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Send batch/i })).toBeDisabled();
  });

  it("Send batch button is enabled once a row has a valid address and positive amount", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("G..."), VALID_ADDR);
    await user.type(screen.getByPlaceholderText("0.5"), "2");

    expect(screen.getByRole("button", { name: /Send batch/i })).not.toBeDisabled();
  });

  it("computes the total amount correctly across multiple rows", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    await user.type(screen.getAllByPlaceholderText("0.5")[0], "2.5");
    await user.click(screen.getByRole("button", { name: /Add recipient/i }));
    await user.type(screen.getAllByPlaceholderText("0.5")[1], "7.5");

    expect(screen.getByText(/10\.0000000 XLM/)).toBeInTheDocument();
  });

  it("shows inline validation error for an invalid Stellar address after batch submit", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    // Add a second valid row so the button is enabled
    await user.click(screen.getByRole("button", { name: /Add recipient/i }));
    const addressInputs = screen.getAllByPlaceholderText("G...");
    const amountInputs  = screen.getAllByPlaceholderText("0.5");

    await user.type(addressInputs[1], VALID_ADDR);
    await user.type(amountInputs[1], "1");

    // First row intentionally left with bad address
    await user.type(addressInputs[0], "INVALID_ADDRESS");
    await user.type(amountInputs[0], "1");

    await user.click(screen.getByRole("button", { name: /Send batch/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid Stellar address/i)).toBeInTheDocument();
    });
  });

  it("shows inline validation error when amount is zero or missing", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Add recipient/i }));
    const addressInputs = screen.getAllByPlaceholderText("G...");
    const amountInputs  = screen.getAllByPlaceholderText("0.5");

    // Second row is valid; enables submit
    await user.type(addressInputs[1], VALID_ADDR);
    await user.type(amountInputs[1], "1");

    // First row has valid address but no amount
    await user.type(addressInputs[0], VALID_ADDR);

    await user.click(screen.getByRole("button", { name: /Send batch/i }));

    await waitFor(() => {
      expect(screen.getByText(/Amount must be greater than 0/i)).toBeInTheDocument();
    });
  });

  it("warns when total XLM exceeds available balance", async () => {
    const user = userEvent.setup();
    render(<BatchPaymentForm {...defaultProps} xlmBalance="5" />);

    await user.type(screen.getByPlaceholderText("G..."), VALID_ADDR);
    await user.type(screen.getByPlaceholderText("0.5"), "10");

    expect(
      screen.getByText(/Total exceeds your available XLM balance/i)
    ).toBeInTheDocument();
  });
});
