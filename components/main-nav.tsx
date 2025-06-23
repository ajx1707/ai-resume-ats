"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  BriefcaseIcon,
  HomeIcon,
  UserIcon,
  FileTextIcon,
  BellIcon,
  MessageSquareIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const routes = [
  {
    label: "Dashboard",
    icon: HomeIcon,
    href: "/dashboard",
  },
  {
    label: "Jobs",
    icon: BriefcaseIcon,
    href: "/dashboard/jobs",
  },
  {
    label: "Profile",
    icon: UserIcon,
    href: "/dashboard/profile",
  },
  {
    label: "Resume Analyzer",
    icon: FileTextIcon,
    href: "/dashboard/resume-analyzer",
  },
  {
    label: "Notifications",
    icon: BellIcon,
    href: "/dashboard/notifications",
  },
  {
    label: "Messages",
    icon: MessageSquareIcon,
    href: "/dashboard/messages",
  }
];

export function MainNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5000/api/conversations/unread-count", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    // Fetch notification count
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch("http://localhost:5000/api/notifications/unread-count", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchUnreadCount();
    fetchNotificationCount();

    // Set up interval to periodically check for new messages and notifications
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotificationCount();
    }, 5000); // Check every 5 seconds (reduced from 30 seconds)

    // Listen for custom events that might be dispatched when messages are read
    const handleMessageRead = () => {
      fetchUnreadCount();
    };

    window.addEventListener('message-read', handleMessageRead);

    // Check for route changes - if we navigate to messages, refresh the count
    if (pathname === '/dashboard/messages') {
      fetchUnreadCount();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('message-read', handleMessageRead);
    };
  }, [pathname]);

  return (
    <nav className="flex items-center justify-between w-full max-w-md">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex flex-col items-center justify-center px-5 text-xs font-medium transition-colors hover:text-primary relative",
            pathname === route.href
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          <div className="relative">
            <route.icon className="h-6 w-6 mb-1" />
            {route.label === "Messages" && unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            {route.label === "Notifications" && notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </div>
          {route.label}
        </Link>
      ))}
    </nav>
  );
}