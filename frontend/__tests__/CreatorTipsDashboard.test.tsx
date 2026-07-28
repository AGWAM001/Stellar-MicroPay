/**
 * __tests__/CreatorTipsDashboard.test.tsx
 * Tests for the CSV export button on the creator tips dashboard (#612).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreatorTipsDashboard from "../components/CreatorTipsDashboard";
import { exportTipsToCSV } from "@/utils/format";

jest.mock("@/utils/format", () => ({
  ...jest.requireActual("@/utils/format"),
  exportTipsToCSV: jest.fn(),
}));

const mockTips = [
  {
    id: 1,
    senderPublicKey: "GABC123SENDERPUBLICKEY",
    creatorPublicKey: "GXYZ789CREATORPUBLICKEY",
    amount: "5.0000000",
    asset: "XLM",
    memo: "Great content!",
    txHash: "abc123",
    timestamp: "2026-07-20T10:00:00Z",
  },
];

global.fetch = jest.fn();

describe("CreatorTipsDashboard CSV export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports the currently visible tips when the export button is clicked", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          tips: mockTips,
          stats: {
            totalTips: 1,
            totalByAsset: { XLM: { count: 1, amount: "5.0000000" } },
            averageTip: "5.0000000",
            largestTip: "5.0000000",
            smallestTip: "5.0000000",
          },
        },
      }),
    });

    render(<CreatorTipsDashboard publicKey="GXYZ789CREATORPUBLICKEY" username="alice" />);

    const exportButton = await screen.findByText("Export CSV");
    await waitFor(() => {
      expect(exportButton.closest("button")).not.toBeDisabled();
    });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportTipsToCSV).toHaveBeenCalledWith(mockTips);
    });
  });

  it("disables the export button when there are no tips", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { tips: [], stats: null } }),
    });

    render(<CreatorTipsDashboard publicKey="GXYZ789CREATORPUBLICKEY" username="alice" />);

    const exportButton = await screen.findByText("Export CSV");
    expect(exportButton.closest("button")).toBeDisabled();
  });
});
