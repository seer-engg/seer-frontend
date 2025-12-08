import { motion } from "framer-motion";
import { FolderKanban, Sparkles, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Projects() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-center min-h-full p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-seer via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-seer/20"
            >
              <FolderKanban className="h-12 w-12 text-white" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold bg-gradient-to-r from-foreground via-seer to-indigo-500 bg-clip-text text-transparent"
            >
              Coming Soon
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground"
            >
              Projects feature is under development
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground/80 max-w-md mx-auto"
            >
              We're building something amazing to help you manage and monitor your agent reliability. Stay tuned!
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">Expected launch: Q1 2025</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
