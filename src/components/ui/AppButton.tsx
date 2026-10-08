import React, { forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "subtle"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      icon,
      iconRight,
      loading = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`app-btn variant-${variant} size-${size} ${
          loading ? "is-loading" : ""
        } ${className}`}
        {...props}
      >
        {loading ? (
          <span className="app-btn-spinner" />
        ) : (
          icon && <span className="app-btn-icon-left">{icon}</span>
        )}
        {children && <span className="app-btn-text">{children}</span>}
        {!loading && iconRight && (
          <span className="app-btn-icon-right">{iconRight}</span>
        )}
      </button>
    );
  }
);

AppButton.displayName = "AppButton";
