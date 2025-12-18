import { Button } from "@/components/ui/button";
import { LogOutIcon, UserCircle2Icon } from "lucide-react";

interface User {
  name: string;
  email: string;
  id: string;
}

interface UserTopBarProps {
  user: User | null;
  onLogout: () => void;
}

export function UserTopBar({ user, onLogout }: UserTopBarProps) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-4">
      {user && (
        <div className="flex gap-1 items-center bg-blue-500/20 backdrop-blur-sm border border-blue-500/50 px-4 py-1 rounded-full">
          <UserCircle2Icon className="text-blue-200" />
          <span className="text-blue-200 text-sm font-medium">{user.name}</span>
        </div>
      )}
      <Button
        onClick={onLogout}
        variant="outline"
        className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
      >
        <LogOutIcon />
        Logout
      </Button>
    </div>
  );
}
