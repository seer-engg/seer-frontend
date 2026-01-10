import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, PlayCircle, Shield, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { restartOnboardingTour } from "@/lib/onboarding-tour";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConnectedAccounts, ConnectedAccount, deleteConnectedAccount } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<ConnectedAccount | null>(null);

  // Fetch OAuth connections
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? 
                   user?.emailAddresses?.[0]?.emailAddress ?? 
                   null;
  
  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ['user-connections', userEmail],
    queryFn: async () => {
      if (!userEmail) return { items: [] };
      const response = await listConnectedAccounts({ userIds: [userEmail] });
      return response;
    },
    enabled: isLoaded && !!userEmail,
  });

  const connections = connectionsData?.items || [];

  // Handle delete button click
  const handleDeleteClick = (conn: ConnectedAccount) => {
    setConnectionToDelete(conn);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!connectionToDelete?.id) return;

    setDeletingConnectionId(connectionToDelete.id);
    setDeleteDialogOpen(false);

    try {
      await deleteConnectedAccount(connectionToDelete.id);
      
      // Invalidate and refetch connections
      await queryClient.invalidateQueries({ queryKey: ['user-connections', userEmail] });
      
      toast({
        title: "Connection deleted",
        description: `Your ${getProviderDisplayName(connectionToDelete.provider || connectionToDelete.toolkit?.slug || 'unknown')} connection has been deleted. You will need to re-authenticate next time you use this integration.`,
      });
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast({
        title: "Failed to delete connection",
        description: error instanceof Error ? error.message : "An error occurred while deleting the connection.",
        variant: "destructive",
      });
    } finally {
      setDeletingConnectionId(null);
      setConnectionToDelete(null);
    }
  };

  // Helper function to format scope name
  const formatScopeName = (scope: string): string => {
    // Google scopes
    if (scope.includes('googleapis.com')) {
      const match = scope.match(/\/auth\/([^\/]+)$/);
      if (match) {
        const service = match[1];
        // Map common Google services to readable names
        const serviceMap: Record<string, string> = {
          'gmail.readonly': 'Gmail (read-only)',
          'gmail': 'Gmail (full access)',
          'gmail.send': 'Gmail (send)',
          'gmail.modify': 'Gmail (modify)',
          'drive.readonly': 'Google Drive (read-only)',
          'drive': 'Google Drive (full access)',
          'spreadsheets.readonly': 'Google Sheets (read-only)',
          'spreadsheets': 'Google Sheets (full access)',
        };
        return serviceMap[service] || service;
      }
    }
    
    // GitHub scopes
    if (scope.startsWith('read:') || scope.startsWith('write:') || scope.startsWith('admin:')) {
      return scope;
    }
    
    // OpenID scopes
    if (scope === 'openid' || scope === 'email' || scope === 'profile') {
      return scope === 'openid' ? 'OpenID Connect' : scope.charAt(0).toUpperCase() + scope.slice(1);
    }
    
    return scope;
  };

  // Helper function to get provider display name
  const getProviderDisplayName = (provider: string): string => {
    const providerMap: Record<string, string> = {
      'google': 'Google',
      'github': 'GitHub',
    };
    return providerMap[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin" data-tour="settings-page">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-seer" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={user?.fullName || ""}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.primaryEmailAddress?.emailAddress || ""}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Profile information is managed through your OAuth provider.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Onboarding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-seer" />
                </div>
                <div>
                  <CardTitle className="text-base">Onboarding</CardTitle>
                  <CardDescription>Take the guided tour again</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Take the guided tour again to refresh your memory about Seer's features and navigation.
                </p>
                <Button
                  onClick={() => {
                    restartOnboardingTour();
                    toast({
                      title: "Tour Restarted",
                      description: "The onboarding tour will begin shortly.",
                    });
                  }}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Restart Tour
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* OAuth Connections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-seer" />
                </div>
                <div>
                  <CardTitle className="text-base">OAuth Connections</CardTitle>
                  <CardDescription>View your connected accounts and granted permissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading connections...</div>
              ) : connections.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No OAuth connections found. Connect an account from a workflow to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((conn: ConnectedAccount) => {
                    const provider = conn.provider || conn.toolkit?.slug || 'unknown';
                    // Handle both space-separated and comma-separated scopes
                    const scopes = conn.scopes 
                      ? conn.scopes.split(/[\s,]+/).filter(Boolean)
                      : [];
                    const isActive = conn.status === 'ACTIVE';
                    
                    const isDeleting = deletingConnectionId === conn.id;
                    
                    return (
                      <div key={conn.id} className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {getProviderDisplayName(provider)}
                            </span>
                            <Badge 
                              variant={isActive ? "default" : "secondary"}
                              className={isActive ? "bg-success/10 text-success border-success/20" : ""}
                            >
                              {conn.status}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(conn)}
                            disabled={isDeleting}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {conn.id && (
                          <div className="text-xs text-muted-foreground">
                            Connection ID: {conn.id}
                          </div>
                        )}
                        
                        {scopes.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Granted Scopes ({scopes.length}):
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pl-2 border-l-2 border-secondary">
                              {scopes.map((scope, idx) => (
                                <div key={idx} className="text-xs text-left">
                                  <span className="text-foreground/70">• </span>
                                  <span className="font-semibold text-foreground">{formatScopeName(scope)}</span>
                                  <span className="text-muted-foreground/60 ml-1">({scope})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No scopes granted
                          </div>
                        )}
                        
                        {connections.indexOf(conn) < connections.length - 1 && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your {connectionToDelete ? getProviderDisplayName(connectionToDelete.provider || connectionToDelete.toolkit?.slug || 'unknown') : ''} connection? 
              You will need to re-authenticate next time you use this integration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
