// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const useSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
  signOut: (...args: unknown[]) => signOut(...args),
}));

const { default: Header } = await import("./Header");

function renderHeader() {
  return render(
    <Header
      activeTab="plan"
      onTabChange={() => {}}
      trucks={["022"]}
      truck="022"
      onTruckChange={() => {}}
      planId="T-1042"
    />,
  );
}

afterEach(() => {
  cleanup();
  signOut.mockClear();
  useSession.mockReset();
});

describe("Header", () => {
  it("shows the signed-in dispatcher's real name and role", () => {
    useSession.mockReturnValue({ data: { user: { name: "M. Hodson", role: "dispatcher" } } });
    renderHeader();
    expect(screen.getByText("M. Hodson")).toBeTruthy();
    expect(screen.getByText("dispatcher")).toBeTruthy();
  });

  it("signs out via next-auth when Sign out is clicked", () => {
    useSession.mockReturnValue({ data: { user: { name: "M. Hodson", role: "dispatcher" } } });
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
