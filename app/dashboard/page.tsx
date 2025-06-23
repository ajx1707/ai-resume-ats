"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  BriefcaseIcon,
  UserIcon,
  FileTextIcon,
  BellIcon,
  MessageSquareIcon,
} from "lucide-react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    // Get user data from localStorage on component mount
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        if (user && user.name) {
          setUserName(user.name);
        }
      }
    } catch (error) {
      console.error("Error retrieving user data:", error);
    }
  }, []);

  const stats = [
    {
      label: "Active Applications",
      value: "12",
      icon: BriefcaseIcon,
    },
    {
      label: "Profile Views",
      value: "48",
      icon: UserIcon,
    },
    {
      label: "Resume Score",
      value: "85%",
      icon: FileTextIcon,
    },
    {
      label: "New Messages",
      value: "3",
      icon: MessageSquareIcon,
    },
    {
      label: "Notifications",
      value: "5",
      icon: BellIcon,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your job search today.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2">
              <stat.icon className="h-5 w-5 text-foreground" />
              <span className="text-sm font-medium">{stat.label}</span>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Recent Applications</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  <BriefcaseIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Senior Frontend Developer</p>
                  <p className="text-sm text-muted-foreground">Tech Corp Inc.</p>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">2d ago</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Upcoming Interviews</h2>
          <div className="space-y-4">
            {[1, 2].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Technical Interview</p>
                  <p className="text-sm text-muted-foreground">Tomorrow at 10:00 AM</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}