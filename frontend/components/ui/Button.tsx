import type { ButtonHTMLAttributes } from "react";
import { buttonClass } from "./styles";
import type { ButtonIntent, ButtonSize, ButtonVariant } from "./styles";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  intent?: ButtonIntent;
  size?: ButtonSize;
}

export default function Button({ variant, intent, size, className, ...props }: Props) {
  return <button className={buttonClass({ variant, intent, size, className })} {...props} />;
}
