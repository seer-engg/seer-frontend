import { useState } from "react";
import { useToast } from "@/hooks/utility/use-toast";
import { restartOnboardingTour } from "@/lib/onboarding-tour";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConnectedAccounts, ConnectedAccount, deleteConnectedAccount } from "@/lib/api-client";
import { getProviderDisplayName } from "@/lib/oauth-helpers";
import { ProfileCard, OnboardingCard, ConnectionsCard } from "@/components/settings/SettingsCards";
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


  const handleRestartTour = () => {
    restartOnboardingTour();
    toast({ title: "Tour Restarted", description: "The onboarding tour will begin shortly." });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin" data-tour="settings-page">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>

        <ProfileCard user={user} />
        <OnboardingCard onRestart={handleRestartTour} />
        <ConnectionsCard
          connections={connections}
          connectionsLoading={connectionsLoading}
          deletingConnectionId={deletingConnectionId}
          onDeleteClick={handleDeleteClick}
        />
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
