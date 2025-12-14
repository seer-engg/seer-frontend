/**
 * Optional resource selector for Google Drive folders
 */

import { executeTool } from "@/lib/composio/proxy-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

type GoogleDriveFolder = {
  id: string;
  name: string;
  mimeType?: string;
};

interface GoogleDriveFolderSelectorProps {
  connectedAccountId: string;
  onFolderSelected?: (folderId: string, folderName: string) => void;
}

export function GoogleDriveFolderSelector({
  connectedAccountId,
  onFolderSelected,
}: GoogleDriveFolderSelectorProps) {
  const { user } = useUser();
  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!connectedAccountId || !userEmail) return;

    setLoading(true);
    setError(null);

    try {
      const response = await executeTool({
        toolSlug: "GOOGLEDRIVE_LIST_FILES",
        userId: userEmail,
        connectedAccountId,
        arguments: {
          q: "mimeType='application/vnd.google-apps.folder'",
          pageSize: 50,
          orderBy: "modifiedTime desc",
        },
      });

      const data = response.data;
      if (data && typeof data === "object") {
        // Handle different response structures
        let files: any[] = [];
        if (Array.isArray(data)) {
          files = data;
        } else if ((data as any).files && Array.isArray((data as any).files)) {
          files = (data as any).files;
        } else if ((data as any).items && Array.isArray((data as any).items)) {
          files = (data as any).items;
        }

        const normalized = files
          .filter((f: any) => f.mimeType === "application/vnd.google-apps.folder")
          .map((f: any) => ({
            id: f.id,
            name: f.name || "Unnamed Folder",
            mimeType: f.mimeType,
          }));
        setFolders(normalized);
        if (normalized.length > 0 && !selectedFolderId) {
          const firstFolder = normalized[0];
          setSelectedFolderId(firstFolder.id);
          onFolderSelected?.(firstFolder.id, firstFolder.name);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setError(message);
      // Don't show error toast - folder selection is optional
      console.error("Failed to fetch folders:", error);
    } finally {
      setLoading(false);
    }
  }, [connectedAccountId, userEmail, onFolderSelected, selectedFolderId]);

  useEffect(() => {
    if (connectedAccountId) {
      fetchFolders();
    }
  }, [connectedAccountId, fetchFolders]);

  // Folder selection is optional, so we can return null if not needed
  if (loading && folders.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading folders...
      </div>
    );
  }

  if (error || !folders.length) {
    // Don't show error - folder selection is optional
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedFolderId}
        onValueChange={(value) => {
          setSelectedFolderId(value);
          const folder = folders.find((f) => f.id === value);
          if (folder) {
            onFolderSelected?.(value, folder.name);
          }
        }}
      >
        <SelectTrigger className="h-7 text-xs w-[200px]">
          <SelectValue placeholder="Select folder (optional)" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          <SelectItem value="">Root (Default)</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              <span className="text-xs">{folder.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" onClick={fetchFolders} disabled={loading}>
        <RefreshCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}

