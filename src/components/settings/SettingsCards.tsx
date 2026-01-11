import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, PlayCircle, Shield } from "lucide-react";
import { ConnectionCard } from "./ConnectionCard";
import type { ConnectedAccount } from "@/lib/api-client";
import type { User } from "@clerk/clerk-react";

interface ProfileCardProps {
  user: User | null | undefined;
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-seer/10 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-seer" />
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
              <Input value={user?.fullName || ""} disabled className="bg-secondary/50" />
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
  );
}

interface OnboardingCardProps {
  onRestart: () => void;
}

export function OnboardingCard({ onRestart }: OnboardingCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
            <Button onClick={onRestart} variant="outline" className="w-full sm:w-auto">
              <PlayCircle className="h-4 w-4 mr-2" />
              Restart Tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface ConnectionsCardProps {
  connections: ConnectedAccount[];
  connectionsLoading: boolean;
  deletingConnectionId: string | null;
  onDeleteClick: (conn: ConnectedAccount) => void;
}

export function ConnectionsCard({
  connections,
  connectionsLoading,
  deletingConnectionId,
  onDeleteClick,
}: ConnectionsCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
              {connections.map((conn: ConnectedAccount, index: number) => (
                <ConnectionCard
                  key={conn.id}
                  connection={conn}
                  isDeleting={deletingConnectionId === conn.id}
                  isLastCard={index === connections.length - 1}
                  onDelete={onDeleteClick}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
