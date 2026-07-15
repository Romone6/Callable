import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="container" style={{ display: "flex", justifyContent: "center" }}>
      <SignUp />
    </main>
  );
}

