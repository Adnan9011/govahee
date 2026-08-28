import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@/components/ui/Input";
import { theme } from "@/theme/theme";

function ClearableHarness({
  initial = "۰۹۱۲",
  onClear,
}: {
  initial?: string;
  onClear?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <TextField
      label="موبایل"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClear={onClear}
    />
  );
}

describe("clearable TextField", () => {
  it("shows clear only when value is non-empty and clears on click", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <ThemeProvider theme={theme}>
        <ClearableHarness onClear={onClear} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("پاک کردن")).toBeInTheDocument();
    await user.click(screen.getByLabelText("پاک کردن"));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("پاک کردن")).not.toBeInTheDocument();
    expect(screen.getByLabelText("موبایل")).toHaveValue("");
  });

  it("can be disabled with clearable={false}", () => {
    render(
      <ThemeProvider theme={theme}>
        <TextField
          label="موبایل"
          value="۰۹۱۲"
          onChange={() => undefined}
          clearable={false}
        />
      </ThemeProvider>,
    );
    expect(screen.queryByLabelText("پاک کردن")).not.toBeInTheDocument();
  });
});
