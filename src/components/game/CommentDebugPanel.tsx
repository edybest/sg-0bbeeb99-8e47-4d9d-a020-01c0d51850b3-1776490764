import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Bug, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface DebugLog {
  id: string;
  timestamp: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  details?: any;
}

export function CommentDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);

  // Listen for debug events
  useEffect(() => {
    const handleDebugEvent = (event: CustomEvent) => {
      const log: DebugLog = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString("ms-MY"),
        type: event.detail.type,
        message: event.detail.message,
        details: event.detail.details,
      };
      
      setLogs((prev) => [log, ...prev].slice(0, 50)); // Keep last 50 logs
    };

    window.addEventListener("comment-debug" as any, handleDebugEvent);
    return () => window.removeEventListener("comment-debug" as any, handleDebugEvent);
  }, []);

  const clearLogs = () => setLogs([]);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-[9999] shadow-lg bg-white"
      >
        <Bug className="w-4 h-4 mr-2" />
        Debug ({logs.length})
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-20 left-4 w-[90vw] max-w-md max-h-[60vh] z-[9999] shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <span className="font-semibold">Debug Panel</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {logs.length} logs
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            className="text-white hover:bg-white/20 h-7 text-xs"
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Tiada log lagi</p>
            <p className="text-xs">Post komen untuk lihat logs</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg p-2 ${getBgColor(log.type)}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getIcon(log.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">
                    {log.timestamp}
                  </div>
                  <div className="text-sm font-medium break-words">
                    {log.message}
                  </div>
                  {log.details && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Details
                      </summary>
                      <pre className="text-xs bg-white/50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-2 text-xs text-gray-500 text-center">
        Logs auto-clear pada refresh page
      </div>
    </Card>
  );
}

// Helper function to emit debug events
export function emitDebugLog(
  type: "success" | "error" | "info" | "warning",
  message: string,
  details?: any
) {
  const event = new CustomEvent("comment-debug", {
    detail: { type, message, details },
  });
  window.dispatchEvent(event);
}