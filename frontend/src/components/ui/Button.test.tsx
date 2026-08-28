import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme/theme";

function renderButton(node: ReactNode) {
  return render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
}

describe("design-system Button", () => {
  it("maps semantic variants and preserves click behavior", async () => {
    const onClick = vi.fn();
    renderButton(
      <Button variant="danger" onClick={onClick}>
        حذف
      </Button>,
    );

    const button = screen.getByRole("button", { name: "حذف" });
    expect(button).toHaveAttribute("data-design-variant", "danger");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables repeated interaction and exposes busy state while loading", async () => {
    const onClick = vi.fn();
    renderButton(
      <Button loading loadingText="در حال ذخیره" onClick={onClick}>
        ذخیره
      </Button>,
    );

    const button = screen.getByRole("button", { name: "در حال ذخیره" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("supports an accessible icon-only loading button", () => {
    renderButton(
      <Button iconOnly loading aria-label="به‌روزرسانی">
        ↻
      </Button>,
    );

    expect(screen.getByRole("button", { name: "به‌روزرسانی" })).toBeDisabled();
  });
});
