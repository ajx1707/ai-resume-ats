import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { BriefcaseIcon, UserIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to JobConnect Pro</h1>
          <p className="text-muted-foreground">Choose how you want to continue</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/auth/signup?type=applicant" className="w-full">
            <Button variant="outline" size="lg" className="w-full h-32 flex flex-col gap-2">
              <UserIcon className="h-8 w-8" />
              <span>I'm an Applicant</span>
            </Button>
          </Link>
          
          <Link href="/auth/signup?type=recruiter" className="w-full">
            <Button variant="outline" size="lg" className="w-full h-32 flex flex-col gap-2">
              <BriefcaseIcon className="h-8 w-8" />
              <span>I'm a Recruiter</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}