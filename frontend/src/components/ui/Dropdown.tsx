import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  type MenuProps,
} from "@mui/material";
import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";

export type DropdownItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
};

export type DropdownProps = Omit<MenuProps, "open" | "anchorEl" | "onClose" | "children"> & {
  label?: ReactNode;
  trigger?: ReactElement;
  items: readonly DropdownItem[];
};

export function Dropdown({
  label = "گزینه‌ها",
  trigger,
  items,
  ...props
}: DropdownProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>, {
        onClick: openMenu,
      })
    : (
        <Button variant="ghost" onClick={openMenu} aria-haspopup="menu" aria-expanded={open}>
          {label}
        </Button>
      );

  return (
    <>
      {triggerNode}
      <Menu
        {...props}
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            disabled={item.disabled}
            onClick={() => {
              closeMenu();
              item.onSelect();
            }}
            sx={item.danger ? { color: "error.main" } : undefined}
          >
            {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
