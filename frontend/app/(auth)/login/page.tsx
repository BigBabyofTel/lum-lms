"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/icons";
import Link from "next/link";


export default function Page() {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  function handleEmail(e) {
    const emailUser = e.target.value;
    setEmail(emailUser)
  }

  function handlePassword(e) {
    const passwordUser = e.target.value;
    setPassword(passwordUser)
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // setLoading(true)
  }

  return (
    <div className="grid h-screen grid-cols-1 place-items-center">
      <div className="grid grid-cols-1 gap-8 sm:min-w-md">
        <Link href="/">
          {/* <Logo className="fill-foreground flex items-start" /> */}
					Logo
        </Link>
        {error && <p className="text-destructive text-sm/6 font-semibold"> {error} </p>}
        <form onSubmit={handleSubmit}>
          <div className="flex max-w-xl flex-col gap-2">
            <label
              htmlFor="email"
              className="text-secondary-foreground text-sm/5 font-medium"
            >
              Email
            </label>
            <Input type="text" id="email" onChange={(e) => handleEmail(e)} />

            <label
              htmlFor="password"
              className="text-secondary-foreground mt-4 text-sm/5 font-medium"
            >
              Password
            </label>
            <Input type="password" onChange={(e) => handlePassword(e)} />
          </div>

          <Button className="mt-10!">
            {loading ? "Loading..." : "Sign In"}
          </Button>
          <p className="text-foreground mt-6 flex items-center gap-2 text-sm font-semibold">
            <span className="text-muted-foreground text-sm">
              Don't have an account?
            </span>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 hover:underline"
            >
              Sign Up
              <span>
                <ArrowRight className="stroke-foreground size-4" />
              </span>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

