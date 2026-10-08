import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  sublabel?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "purple" | "slate";
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  sublabel,
  change,
  changeType = "neutral",
  icon,
  tone = "slate",
  onClick,
  className = "",
}) => {
  return (
    <div
      className={`app-stat-card tone-${tone} ${onClick ? "is-clickable" : ""} ${className}`}
      onClick={onClick}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value tabular-nums">{value}</div>
        {(sublabel || change) && (
          <div className="stat-card-footer">
            {change && (
              <span className={`stat-card-change type-${changeType}`}>
                {change}
              </span>
            )}
            {sublabel && <span className="stat-card-sublabel">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
