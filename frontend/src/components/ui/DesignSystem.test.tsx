import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Button,
  ConfirmDialogProvider,
  ConfirmDialog,
  FormField,
  PageHeader,
  Table,
  confirmAction,
} from "@/components/ui";
import { theme } from "@/theme/theme";

function renderUi(node: ReactNode) {
  return render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
}

function ConfirmActionHarness() {
  const [result, setResult] = useState<boolean | null>(null);
  return (
    <ConfirmDialogProvider>
      <Button
        onClick={async () => {
          setResult(await confirmAction("رکورد حذف شود؟"));
        }}
      >
        درخواست حذف
      </Button>
      {result === true ? <span>تأیید شد</span> : null}
    </ConfirmDialogProvider>
  );
}

describe("design-system primitives", () => {
  it("connects labels and errors to form controls", () => {
    renderUi(
      <FormField label="نام" error="نام الزامی است">
        <input />
      </FormField>,
    );

    const input = screen.getByLabelText("نام");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("نام الزامی است");
  });

  it("renders semantic page hierarchy", () => {
    renderUi(<PageHeader title="مدیریت کاربران" description="فهرست کاربران سامانه" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("مدیریت کاربران");
  });

  it("renders table rows and a consistent empty state", () => {
    const columns = [
      {
        id: "name",
        header: "نام",
        render: (row: { id: number; name: string }) => row.name,
      },
    ] as const;
    const { rerender } = renderUi(
      <Table
        rows={[{ id: 1, name: "کاربر نمونه" }]}
        columns={columns}
        rowKey={(row) => row.id}
      />,
    );
    expect(screen.getByText("کاربر نمونه")).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Table rows={[]} columns={columns} rowKey={(row) => row.id} emptyTitle="موردی نیست" />
      </ThemeProvider>,
    );
    expect(screen.getByText("موردی نیست")).toBeInTheDocument();
  });

  it("uses the shared confirmation behavior", async () => {
    const onConfirm = vi.fn();
    renderUi(
      <ConfirmDialog
        open
        title="حذف رکورد"
        message="این عملیات بازگشت‌پذیر نیست."
        confirmLabel="حذف"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "حذف" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("replaces browser confirm with the accessible confirmation provider", async () => {
    renderUi(<ConfirmActionHarness />);

    await userEvent.click(screen.getByRole("button", { name: "درخواست حذف" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("رکورد حذف شود؟");
    await userEvent.click(screen.getByRole("button", { name: "تأیید" }));
    expect(await screen.findByText("تأیید شد")).toBeInTheDocument();
  });
});
