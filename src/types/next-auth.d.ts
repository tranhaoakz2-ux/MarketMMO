import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      walletBalance: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    walletBalance?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    walletBalance?: number;
  }
}
