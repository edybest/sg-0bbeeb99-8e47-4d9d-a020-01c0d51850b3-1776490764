import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { whatsappService } from "@/services/whatsappService";
import { useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export function FonnteGroupSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await whatsappService.updateFonnteGroupList();

      if (response.success) {
        setResult({
          success: true,
          message: "Group list berjaya dikemaskini! WhatsApp group kini boleh terima webhook.",
          data: response.data,
        });
      } else {
        setResult({
          success: false,
          message: response.error || "Gagal kemaskini group list",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Ralat sistem semasa kemaskini group list",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Sync WhatsApp Group List
        </CardTitle>
        <CardDescription>
          Kemaskini senarai group WhatsApp di Fonnte untuk enable webhook group messages.
          Perlu dipanggil sekali selepas add bot ke group baru.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSync}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengemaskini...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Group List
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <div className="flex-1">
                <AlertDescription>{result.message}</AlertDescription>
                {result.data && (
                  <pre className="mt-2 rounded bg-slate-100 p-2 text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </Alert>
        )}

        <div className="rounded-lg bg-blue-50 p-4 text-sm">
          <p className="font-semibold text-blue-900 mb-2">📋 Langkah-langkah:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Pastikan bot WhatsApp sudah ditambah ke group sebagai admin</li>
            <li>Klik butang "Update Group List" di atas</li>
            <li>Tunggu sehingga sync selesai</li>
            <li>Test dengan hantar command dalam group: <code className="bg-blue-100 px-1 rounded">#blok 22.04.2026</code></li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}