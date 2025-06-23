"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  SearchIcon,
  SendIcon,
  PhoneIcon,
  VideoIcon,
  MoreVerticalIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
  UserIcon,
  BriefcaseIcon,
  ImageIcon,
  FileIcon,
  ArchiveIcon,
  TrashIcon,
  PaperclipIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Define interfaces for our data structures
interface Conversation {
  _id: string;
  last_message: string;
  last_message_at: string;
  job_id?: string;
  job_title?: string;
  unread_count?: number;
  archived_by?: string[];
  deleted_by?: string[];
  other_participants: {
    user_id: string;
    name: string;
    avatar: string;
    role: string;
  }[];
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  user_type: string;
  avatar: string;
}

interface Message {
  _id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_sender: boolean;
  read: boolean;
  is_system_message?: boolean;
  file?: {
    type: string; // 'image' or 'document'
    url: string;
    name: string;
    size?: number;
  };
}

export default function MessagesPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User search state
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
    fetchUnreadCount();

    // Set up interval to periodically check for new messages
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (selectedConversation) {
        fetchMessages(selectedConversation, false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);

      // Dispatch a custom event to notify that messages are being read
      // This will trigger the badge update in the navigation bar
      const messageReadEvent = new CustomEvent('message-read');
      window.dispatchEvent(messageReadEvent);
    }
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Check if it's an image
    const isImageFile = file.type.startsWith('image/');
    setIsImage(isImageFile);

    // Create preview for images
    if (isImageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setIsImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/conversations/unread-count", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }

      const data = await response.json();
      setUnreadCount(data.unread_count);

      // Dispatch a custom event to notify that unread count has changed
      // This will trigger the badge update in the navigation bar
      const messageReadEvent = new CustomEvent('message-read');
      window.dispatchEvent(messageReadEvent);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Fetch conversations from API
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to view your messages",
          variant: "destructive",
        });
        return;
      }

      const url = `http://localhost:5000/api/conversations${showArchived ? '?archived=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      setConversations(data.conversations);

      // Select the first conversation if available and none is selected
      if (data.conversations.length > 0 && !selectedConversation && !showArchived) {
        setSelectedConversation(data.conversations[0]._id);
      } else if (showArchived && selectedConversation) {
        // Deselect conversation when viewing archived
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoadingMessages(true);
      }
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages);

      // Store user type if provided
      if (data.user_type) {
        localStorage.setItem("user_type", data.user_type);
      }

      // Immediately update the conversation list to reflect read status
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              unread_count: 0 // Mark as read in the UI immediately
            };
          }
          return conv;
        });
      });

      // Refresh unread count after reading messages
      fetchUnreadCount();
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (showLoading) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!selectedConversation || (!newMessage.trim() && !selectedFile)) return;

    try {
      setIsSendingMessage(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      // Prepare message data
      const messageData: any = {
        content: newMessage.trim()
      };

      // Handle file upload if a file is selected
      if (selectedFile) {
        // Convert file to base64
        const base64Data = await fileToBase64(selectedFile);

        // Add file data to the message
        messageData.file = {
          type: selectedFile.type,
          url: base64Data,
          name: selectedFile.name,
          size: selectedFile.size
        };
      }

      const response = await fetch(`http://localhost:5000/api/conversations/${selectedConversation}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Add the new message to the messages array
      setMessages(prev => [...prev, data.message_data]);

      // Update the conversation in the list
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === selectedConversation) {
            return {
              ...conv,
              last_message: data.message_data.content || (selectedFile ? `[${isImage ? 'Image' : 'File'}]` : ''),
              last_message_at: new Date().toISOString(),
              unread_count: 0 // Reset unread count for this conversation
            };
          }
          return conv;
        });
      });

      // Clear the input and file
      setNewMessage("");
      clearSelectedFile();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Archive a conversation
  const archiveConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}/archive`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to archive conversation");
      }

      // Refresh conversations
      await fetchConversations();

      toast({
        title: "Success",
        description: "Conversation archived",
      });

      // If the archived conversation was selected, deselect it
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error("Error archiving conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive conversation",
        variant: "destructive",
      });
    }
  };

  // Unarchive a conversation
  const unarchiveConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}/unarchive`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to unarchive conversation");
      }

      // Refresh conversations
      await fetchConversations();

      toast({
        title: "Success",
        description: "Conversation unarchived",
      });
    } catch (error) {
      console.error("Error unarchiving conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unarchive conversation",
        variant: "destructive",
      });
    }
  };

  // Delete a conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Refresh conversations
      await fetchConversations();

      toast({
        title: "Success",
        description: "Conversation deleted",
      });

      // If the deleted conversation was selected, deselect it
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "h:mm a");
    } catch (error) {
      return dateString;
    }
  };

  // Format relative time for conversation list
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 48) return "Yesterday";
      return format(date, "MMM d");
    } catch (error) {
      return "";
    }
  };

  // Search for users by name
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingUsers(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();
      setSearchResults(data.users);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Create a new conversation with a user
  const createConversation = async (recipientId: string) => {
    try {
      setIsCreatingConversation(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient_id: recipientId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();

      // Refresh conversations and select the new one
      await fetchConversations();
      setSelectedConversation(data.conversation_id);

      // Close the user search dialog
      setShowUserSearch(false);
      setUserSearchQuery("");
      setSearchResults([]);

      toast({
        title: "Success",
        description: "Conversation created successfully",
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive",
      });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Handle user search input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    return conv.other_participants.some(participant =>
      participant.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || (conv.job_title && conv.job_title.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Get the current conversation details
  const currentConversation = conversations.find(conv => conv._id === selectedConversation);
  const currentParticipant = currentConversation?.other_participants[0];

  return (
    <div className="container mx-auto p-6 pb-16"> {/* Reduced bottom padding to use more space */}
      <div className="grid grid-cols-[300px_1fr] gap-6 h-[calc(100vh-8rem)]"> {/* Increased height calculation */}
        <Card className="p-4 overflow-hidden flex flex-col">
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
                  <DialogTrigger asChild>
                    <Button size="icon" onClick={() => setShowUserSearch(true)}>
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Message</DialogTitle>
                      <DialogDescription>
                        Search for a user to start a conversation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="Search by name..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="max-h-[300px] overflow-y-auto">
                        {isSearchingUsers ? (
                          <div className="flex items-center justify-center h-20">
                            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="text-center p-4 text-muted-foreground">
                            {userSearchQuery ? "No users found" : "Type to search for users"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {searchResults.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
                                onClick={() => createConversation(user.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>
                                      {user.name.split(" ").map((n) => n[0]).join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                                <Badge variant={user.user_type === "recruiter" ? "default" : "secondary"}>
                                  {user.user_type === "recruiter" ? "Recruiter" : "Applicant"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className={!showArchived ? "font-medium" : "text-muted-foreground"}
                  onClick={() => {
                    if (showArchived) {
                      setShowArchived(false);
                      fetchConversations();
                    }
                  }}
                >
                  Inbox
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={showArchived ? "font-medium" : "text-muted-foreground"}
                  onClick={() => {
                    if (!showArchived) {
                      setShowArchived(true);
                      fetchConversations();
                    }
                  }}
                >
                  <ArchiveIcon className="h-4 w-4 mr-1" />
                  Archived
                </Button>
              </div>
            </div>

            <Separator />

            {isLoadingConversations ? (
              <div className="flex items-center justify-center h-40">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                {searchQuery ? "No conversations match your search" : "No conversations yet"}
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1">
                {filteredConversations.map((conversation) => {
                  const participant = conversation.other_participants[0];
                  const hasUnread = (conversation.unread_count || 0) > 0;

                  return (
                    <div key={conversation._id} className="relative group">
                      <button
                        onClick={() => setSelectedConversation(conversation._id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedConversation === conversation._id
                            ? "bg-muted"
                            : "hover:bg-muted/50"
                        } ${hasUnread ? "font-medium" : ""}`}
                      >
                        <div className="flex gap-3">
                          <Avatar>
                            <AvatarImage src={participant?.avatar} alt={participant?.name} />
                            <AvatarFallback>
                              {participant?.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`truncate ${hasUnread ? "font-medium" : ""}`}>{participant?.name}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(conversation.last_message_at)}
                              </span>
                            </div>
                            {conversation.job_title && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BriefcaseIcon className="h-3 w-3" />
                                <span className="truncate">{conversation.job_title}</span>
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message || "No messages yet"}
                            </p>
                          </div>
                          {hasUnread && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {showArchived ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              unarchiveConversation(conversation._id);
                            }}
                            title="Unarchive"
                          >
                            <ArchiveIcon className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveConversation(conversation._id);
                            }}
                            title="Archive"
                          >
                            <ArchiveIcon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this conversation?")) {
                              deleteConversation(conversation._id);
                            }
                          }}
                          title="Delete"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {selectedConversation ? (
          <Card className="flex flex-col overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-background z-10">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={currentParticipant?.avatar}
                    alt={currentParticipant?.name}
                  />
                  <AvatarFallback>
                    {currentParticipant?.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {currentParticipant?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentParticipant?.role}
                  </p>
                  {currentConversation?.job_title && (
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="flex items-center gap-1 text-xs py-0 h-5">
                        <BriefcaseIcon className="h-3 w-3" />
                        <span>{currentConversation.job_title}</span>
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <PhoneIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <VideoIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[calc(100vh-20rem)]">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    // Check if it's a system message
                    if (message.sender_id === "system" || message.is_system_message) {
                      return (
                        <div key={message._id} className="flex justify-center">
                          <div className="max-w-[80%] rounded-lg p-2 bg-muted/50 text-center">
                            <p className="text-sm text-muted-foreground">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Regular user message
                    return (
                      <div
                        key={message._id}
                        className={`flex ${
                          message.is_sender ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.is_sender
                              ? "bg-muted ml-12"
                              : "bg-background border ml-0 mr-12"
                          }`}
                        >
                          {/* Message content */}
                          {message.content && <p className="mb-2">{message.content}</p>}

                          {/* File attachment */}
                          {message.file && (
                            <div className="mt-2 mb-2">
                              {message.file.type.startsWith('image/') ? (
                                // Image file
                                <div className="rounded-md overflow-hidden border">
                                  <a href={message.file.url} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={message.file.url}
                                      alt="Attached image"
                                      className="max-w-full h-auto max-h-[200px] object-contain"
                                    />
                                  </a>
                                </div>
                              ) : (
                                // Other file types
                                <div className="flex items-center p-2 border rounded-md">
                                  <FileIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                                  <div className="overflow-hidden">
                                    <a
                                      href={message.file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium hover:underline truncate block"
                                    >
                                      {message.file.name}
                                    </a>
                                    <p className="text-xs text-muted-foreground">
                                      {message.file.size ? `${Math.round(message.file.size / 1024)} KB` : ''}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground mt-1">
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t sticky bottom-0 bg-background">
              {selectedFile && (
                <div className="mb-3 p-2 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isImage ? (
                        <ImageIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                      ) : (
                        <FileIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelectedFile}
                      className="h-6 w-6"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {isImage && filePreview && (
                    <div className="mt-2">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-[100px] max-w-full rounded-md object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <div className="relative flex-1">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSendingMessage}
                    className="py-6 text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSendingMessage}
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSendingMessage || (!newMessage.trim() && !selectedFile)}
                  size="lg"
                  className="px-6"
                >
                  {isSendingMessage ? (
                    <Loader2Icon className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <SendIcon className="h-5 w-5 mr-2" />
                  )}
                  Send
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list or start a new one
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}