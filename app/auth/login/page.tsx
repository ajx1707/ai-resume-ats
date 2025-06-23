"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BriefcaseIcon, UserIcon, LockIcon } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Sending login request to backend...");
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("Response received:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem("token", data.access_token);

      // Save user data including user type
      localStorage.setItem("user", JSON.stringify({
        name: data.user.name,
        email: data.user.email,
        type: data.user.user_type
      }));

      // Also store user_type separately for ease of access
      localStorage.setItem("userType", data.user.user_type);
      localStorage.setItem("userId", data.user.id);

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4 bg-[url('/images/job-bg.svg')] bg-cover bg-center bg-no-repeat">
      <Card className="w-full max-w-md p-8 space-y-6 backdrop-blur-sm bg-background/90 border-2 shadow-xl">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <LockIcon className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground">
            Enter your credentials to sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background/50"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Logging in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-muted-foreground px-2">OR</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/auth/signup?type=applicant" className="w-full">
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>Job Seeker</span>
              </Button>
            </Link>

            <Link href="/auth/signup?type=recruiter" className="w-full">
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <BriefcaseIcon className="h-4 w-4" />
                <span>Recruiter</span>
              </Button>
            </Link>
          </div>

          <p className="mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}