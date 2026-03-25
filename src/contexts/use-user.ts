import { useContext } from "react";

import { UserContext } from "@/contexts/user-types";

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
