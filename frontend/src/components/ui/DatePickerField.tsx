import {
  JalaliDateField,
  type JalaliDateFieldProps,
} from "@/components/JalaliDateField";
import {
  JalaliDateTimeField,
  type JalaliDateTimeFieldProps,
} from "@/components/JalaliDateTimeField";

type SharedDatePickerProps = {
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  size?: JalaliDateFieldProps["size"];
};

export type DatePickerFieldProps =
  | (SharedDatePickerProps & {
      mode?: "date";
      onChange: JalaliDateFieldProps["onChange"];
    })
  | (SharedDatePickerProps & {
      mode: "datetime";
      onChange: JalaliDateTimeFieldProps["onChange"];
    });

export function DatePickerField({
  mode = "date",
  ...props
}: DatePickerFieldProps) {
  if (mode === "datetime") {
    return <JalaliDateTimeField {...props} />;
  }
  return <JalaliDateField {...props} />;
}
