"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfileDebugPage() {
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileDebugInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get token
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        // Fetch profile debug data
        const response = await fetch("http://localhost:5000/api/debug/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch profile debug info");
        }
        
        const data = await response.json();
        setProfileData(data);
      } catch (error: any) {
        console.error("Error fetching profile debug info:", error);
        setError(error.message || "Failed to load profile debug data");
        toast({
          title: "Error",
          description: error.message || "Failed to load profile debug data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileDebugInfo();
  }, [toast]);
  
  const refreshData = () => {
    setIsLoading(true);
    setProfileData(null);
    setError(null);
    fetchProfileDebugInfo();
  };
  
  const fetchProfileDebugInfo = async () => {
    try {
      // Get token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      // Fetch profile debug data
      const response = await fetch("http://localhost:5000/api/debug/profile", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch profile debug info");
      }
      
      const data = await response.json();
      setProfileData(data);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching profile debug info:", error);
      setError(error.message || "Failed to load profile debug data");
      setIsLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to load profile debug data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Profile Debug Info</h1>
        <Button onClick={refreshData} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Refresh Data"
          )}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2Icon className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile debug data...</span>
        </div>
      ) : error ? (
        <Card className="p-6">
          <div className="text-destructive">Error: {error}</div>
        </Card>
      ) : profileData ? (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Structure</h2>
            <div className="space-y-2">
              <div>
                <strong>Fields:</strong> {profileData.profile_structure.fields.join(", ")}
              </div>
              <div>
                <strong>Has photo field:</strong> {profileData.profile_structure.has_photo_field ? "Yes" : "No"}
              </div>
              <div>
                <strong>Photo data length:</strong> {profileData.profile_structure.photo_length} characters
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Complete Profile Data</h2>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
              {JSON.stringify(profileData.profile, null, 2)}
            </pre>
          </Card>
        </div>
      ) : (
        <Card className="p-6">
          <div>No profile data available</div>
        </Card>
      )}
    </div>
  );
} 