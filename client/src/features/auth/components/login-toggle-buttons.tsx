import { Button } from "@/components/ui/button";
import { Mail, Phone } from "lucide-react";

interface LoginToggleButtonsProps {
  currentView: "phone" | "email";
  onToggle: () => void;
}

export default function LoginToggleButtons({ currentView, onToggle }: LoginToggleButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant={currentView === "phone" ? "default" : "outline"}
        onClick={() => currentView !== "phone" && onToggle()}
        className="w-full"
      >
        <Phone className="mr-2 h-4 w-4" aria-hidden />
        Phone
      </Button>
      <Button
        type="button"
        variant={currentView === "email" ? "default" : "outline"}
        onClick={() => currentView !== "email" && onToggle()}
        className="w-full"
      >
        <Mail className="mr-2 h-4 w-4" aria-hidden />
        Email
      </Button>
    </div>
  );
}
