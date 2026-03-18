import React from "react";

interface MemberDebugPanelProps {
  memberInfo?: {
    id?: string | null;
    email?: string | null;
    username?: string | null;
    isAdmin?: boolean;
  };
  extra?: Record<string, unknown>;
}

export function MemberDebugPanel({ memberInfo, extra }: MemberDebugPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-black/80 text-[10px] text-green-300 px-3 py-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold">MEMBER DEBUG MODE</span>
        <span className="text-[9px] text-green-400/80">
          Jangan kongsi screenshot ini secara public
        </span>
      </div>
      {memberInfo && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {memberInfo.id && (
            <span>
              <span className="text-green-500/80">id:</span> {memberInfo.id}
            </span>
          )}
          {memberInfo.email && (
            <span>
              <span className="text-green-500/80">email:</span> {memberInfo.email}
            </span>
          )}
          {memberInfo.username && (
            <span>
              <span className="text-green-500/80">user:</span> {memberInfo.username}
            </span>
          )}
          {typeof memberInfo.isAdmin === "boolean" && (
            <span>
              <span className="text-green-500/80">admin:</span>{" "}
              {memberInfo.isAdmin ? "true" : "false"}
            </span>
          )}
        </div>
      )}
      {extra && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-green-200/90">
          {Object.entries(extra).map(([key, value]) => (
            <span key={key}>
              <span className="text-green-500/80">{key}:</span>{" "}
              {typeof value === "string" || typeof value === "number"
                ? String(value)
                : JSON.stringify(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}