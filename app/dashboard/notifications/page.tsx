"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon,
  MessageSquareIcon,
  UserIcon,
  CalendarIcon,
  CheckIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
  related_id?: string;
  related_type?: string;
  message_count?: number;
  sender_id?: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"applicant" | "recruiter">("applicant");

  useEffect(() => {
    // Get user type from localStorage
    const userType = localStorage.getItem("userType");
    if (userType === "recruiter" || userType === "applicant") {
      setUserType(userType);
    }

    // Fetch notifications
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("http://localhost:5000/api/notifications", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const requestBody = notificationId ? { notification_id: notificationId } : {};

      const response = await fetch("http://localhost:5000/api/notifications/mark-read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read");
      }

      // Update local state
      if (notificationId) {
        setNotifications(notifications.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        ));
      } else {
        setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      }

      toast({
        title: "Success",
        description: notificationId ? "Notification marked as read" : "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = () => markAsRead();

  const clearAll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("http://localhost:5000/api/notifications/clear", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      // Update local state
      setNotifications([]);

      toast({
        title: "Success",
        description: "All notifications cleared",
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "application_submitted":
      case "application_reviewed":
      case "application_shortlisted":
      case "application_rejected":
      case "new_application":
        return <BriefcaseIcon className="h-6 w-6" />;
      case "new_message":
        return <MessageSquareIcon className="h-6 w-6" />;
      case "profile_view":
        return <UserIcon className="h-6 w-6" />;
      case "interview_scheduled":
        return <CalendarIcon className="h-6 w-6" />;
      case "application_viewed":
        return <EyeIcon className="h-6 w-6" />;
      default:
        return <ClockIcon className="h-6 w-6" />;
    }
  };

  const formatDate = (notification: Notification) => {
    try {
      // Use updated_at if available (for grouped notifications), otherwise use created_at
      const dateString = notification.updated_at || notification.created_at;
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {userType === "recruiter"
              ? "Stay updated with your job posting activities"
              : "Stay updated with your job search activities"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckIcon className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button variant="outline" onClick={clearAll}>
            <TrashIcon className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No notifications yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`p-4 ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{notification.title}</h3>
                  <p className="text-muted-foreground">{notification.message}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(notification)}
                </div>
                {!notification.read ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => markAsRead(notification._id)}
                    title="Mark as read"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8"></div> /* Spacer for alignment */
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}