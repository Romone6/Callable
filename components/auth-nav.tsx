"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthNav() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <>
        <SignInButton mode="modal">
          <Button type="button" size="sm" variant="secondary">
            Sign In
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button type="button" size="sm">
            Get Started
          </Button>
        </SignUpButton>
      </>
    );
  }

  return (
    <>
      <Button asChild size="sm" variant="secondary">
        <Link href="/dashboard">Open App</Link>
      </Button>
      <UserButton />
    </>
  );
}
