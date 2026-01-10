import { Settings, Moon, Sun, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FloatingActions() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes = ["dark", "light", "system"];
    const currentIndex = themes.indexOf(theme || "dark");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5" />;
      case "system":
        return <Monitor className="h-5 w-5" />;
      default:
        return <Moon className="h-5 w-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Theme: Light";
      case "system":
        return "Theme: System";
      default:
        return "Theme: Dark";
    }
  };

  return (
    <div
      className="absolute bottom-6 right-6 flex flex-col gap-3 z-40"
      data-floating-actions
    >
      {/* Settings Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:border-seer/50"
          >
            <Link to="/settings" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      {/* Theme Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            onClick={cycleTheme}
            aria-label={getThemeLabel()}
            className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:border-seer/50"
          >
            {getThemeIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{getThemeLabel()}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
