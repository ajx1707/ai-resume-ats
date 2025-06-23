"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  UserIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  AwardIcon,
  LinkedinIcon,
  GithubIcon,
  Globe2Icon,
  PlusIcon,
  XIcon,
  PencilIcon,
  Loader2Icon,
  SaveIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Define the profile interface
interface Profile {
  _id?: string;
  user_id?: string;
  title: string;
  location: string;
  about: string;
  photo?: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  social_links: {
    linkedin: string;
    github: string;
    website: string;
  };
}

interface Experience {
  title: string;
  company: string;
  period: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  period: string;
  description: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // User data state
  const [userName, setUserName] = useState("");
  
  // Profile state
  const [profile, setProfile] = useState<Profile>({
    title: "",
    location: "",
    about: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    social_links: {
      linkedin: "",
      github: "",
      website: ""
    }
  });
  
  // New skill state
  const [newSkill, setNewSkill] = useState("");
  
  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Fetch profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get user data from localStorage
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          if (user && user.name) {
            setUserName(user.name);
          }
        }
        
        // Get token
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        // Fetch profile data
        const response = await fetch("http://localhost:5000/api/profile", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch profile");
        }
        
        const data = await response.json();
        setProfile(data.profile);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [toast]);
  
  // Handle save profile
  const saveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Get token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      // Save profile data
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profile)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save profile");
      }
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile data",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add skill
  const addSkill = () => {
    if (newSkill && !profile.skills.includes(newSkill)) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill]
      });
      setNewSkill("");
    }
  };

  // Remove skill
  const removeSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(skill => skill !== skillToRemove)
    });
  };
  
  // Update field handler
  const handleFieldChange = (field: string, value: string) => {
    setProfile({
      ...profile,
      [field]: value
    });
  };
  
  // Update social link handler
  const handleSocialLinkChange = (platform: string, value: string) => {
    setProfile({
      ...profile,
      social_links: {
        ...profile.social_links,
        [platform]: value
      }
    });
  };
  
  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsUploadingPhoto(true);
      
      const file = files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Photo must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        console.log("Photo converted to base64, length:", base64Data.length);
        
        // Get token
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        
        // Upload photo
        const response = await fetch("http://localhost:5000/api/profile/photo", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ photo: base64Data })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload photo");
        }
        
        const responseData = await response.json();
        console.log("Photo upload response:", responseData);
        
        // Update local state
        setProfile({
          ...profile,
          photo: base64Data
        });
        
        toast({
          title: "Success",
          description: "Profile photo updated successfully"
        });
      };
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2Icon className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <Button onClick={isEditing ? saveProfile : () => setIsEditing(true)} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            <>
              <SaveIcon className="mr-2 h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={profile.photo || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80"}
                  alt="Profile picture"
                />
                <AvatarFallback>{userName.split(" ").map(n => n[0]).join("").toUpperCase()}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="flex flex-col items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="profile-photo-upload"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                  <label htmlFor="profile-photo-upload">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="cursor-pointer" 
                      disabled={isUploadingPhoto}
                      asChild
                    >
                      <span>
                        {isUploadingPhoto ? (
                          <>
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Change Photo"
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
              <div className="text-center">
                <h2 className="text-xl font-semibold">{userName}</h2>
                {isEditing ? (
                  <Input
                    value={profile.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    placeholder="Your title (e.g. Software Engineer)"
                    className="mt-2"
                  />
                ) : (
                  <p className="text-muted-foreground">{profile.title || "Add your title"}</p>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe2Icon className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={profile.location}
                    onChange={(e) => handleFieldChange("location", e.target.value)}
                    placeholder="Your location"
                  />
                ) : (
                  <span>{profile.location || "Add your location"}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <LinkedinIcon className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={profile.social_links.linkedin}
                    onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                    placeholder="LinkedIn URL"
                  />
                ) : (
                  <a 
                    href={profile.social_links.linkedin} 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.social_links.linkedin ? "LinkedIn Profile" : "Add LinkedIn"}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <GithubIcon className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={profile.social_links.github}
                    onChange={(e) => handleSocialLinkChange("github", e.target.value)}
                    placeholder="GitHub URL"
                  />
                ) : (
                  <a 
                    href={profile.social_links.github} 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.social_links.github ? "GitHub Profile" : "Add GitHub"}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Globe2Icon className="h-4 w-4 text-muted-foreground" />
                {isEditing ? (
                  <Input
                    value={profile.social_links.website}
                    onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                    placeholder="Personal website URL"
                  />
                ) : (
                  <a 
                    href={profile.social_links.website} 
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profile.social_links.website ? "Personal Website" : "Add Website"}
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Skills</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill"
                  />
                  <Button onClick={addSkill} variant="outline" size="icon">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="pr-1.5">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No skills added yet</p>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="h-5 w-5" />
              <h3 className="font-semibold">About Me</h3>
            </div>
            {isEditing ? (
              <Textarea
                className="min-h-[150px]"
                value={profile.about}
                onChange={(e) => handleFieldChange("about", e.target.value)}
                placeholder="Write a short bio about yourself"
              />
            ) : (
              <p className="text-muted-foreground">
                {profile.about || "Add information about yourself"}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <BriefcaseIcon className="h-5 w-5" />
              <h3 className="font-semibold">Work Experience</h3>
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => {
                    setProfile({
                      ...profile,
                      experience: [
                        ...(profile.experience || []),
                        { title: "", company: "", period: "", description: "" }
                      ]
                    });
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Experience
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {profile.experience && profile.experience.length > 0 ? (
                profile.experience.map((job, index) => (
                  <div key={index} className="relative pl-4 border-l-2 border-muted pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={job.title}
                          onChange={(e) => {
                            const updatedExperience = [...profile.experience];
                            updatedExperience[index].title = e.target.value;
                            setProfile({...profile, experience: updatedExperience});
                          }}
                          placeholder="Job title"
                        />
                        <Input
                          value={job.company}
                          onChange={(e) => {
                            const updatedExperience = [...profile.experience];
                            updatedExperience[index].company = e.target.value;
                            setProfile({...profile, experience: updatedExperience});
                          }}
                          placeholder="Company name"
                        />
                        <Input
                          value={job.period}
                          onChange={(e) => {
                            const updatedExperience = [...profile.experience];
                            updatedExperience[index].period = e.target.value;
                            setProfile({...profile, experience: updatedExperience});
                          }}
                          placeholder="Time period (e.g. 2020 - Present)"
                        />
                        <Textarea
                          value={job.description}
                          onChange={(e) => {
                            const updatedExperience = [...profile.experience];
                            updatedExperience[index].description = e.target.value;
                            setProfile({...profile, experience: updatedExperience});
                          }}
                          placeholder="Job description"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            const updatedExperience = profile.experience.filter((_, i) => i !== index);
                            setProfile({...profile, experience: updatedExperience});
                          }}
                        >
                          <XIcon className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-medium">{job.title}</h4>
                        <div className="text-sm text-muted-foreground">
                          <p>{job.company}</p>
                          <p>{job.period}</p>
                        </div>
                        <p className="text-muted-foreground">{job.description}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No work experience added yet</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCapIcon className="h-5 w-5" />
              <h3 className="font-semibold">Education</h3>
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => {
                    setProfile({
                      ...profile,
                      education: [
                        ...(profile.education || []),
                        { degree: "", school: "", period: "", description: "" }
                      ]
                    });
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Education
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {profile.education && profile.education.length > 0 ? (
                profile.education.map((edu, index) => (
                  <div key={index} className="relative pl-4 border-l-2 border-muted pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={edu.degree}
                          onChange={(e) => {
                            const updatedEducation = [...profile.education];
                            updatedEducation[index].degree = e.target.value;
                            setProfile({...profile, education: updatedEducation});
                          }}
                          placeholder="Degree"
                        />
                        <Input
                          value={edu.school}
                          onChange={(e) => {
                            const updatedEducation = [...profile.education];
                            updatedEducation[index].school = e.target.value;
                            setProfile({...profile, education: updatedEducation});
                          }}
                          placeholder="School name"
                        />
                        <Input
                          value={edu.period}
                          onChange={(e) => {
                            const updatedEducation = [...profile.education];
                            updatedEducation[index].period = e.target.value;
                            setProfile({...profile, education: updatedEducation});
                          }}
                          placeholder="Time period (e.g. 2015 - 2019)"
                        />
                        <Textarea
                          value={edu.description}
                          onChange={(e) => {
                            const updatedEducation = [...profile.education];
                            updatedEducation[index].description = e.target.value;
                            setProfile({...profile, education: updatedEducation});
                          }}
                          placeholder="Description"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            const updatedEducation = profile.education.filter((_, i) => i !== index);
                            setProfile({...profile, education: updatedEducation});
                          }}
                        >
                          <XIcon className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h4 className="font-medium">{edu.degree}</h4>
                        <div className="text-sm text-muted-foreground">
                          <p>{edu.school}</p>
                          <p>{edu.period}</p>
                        </div>
                        <p className="text-muted-foreground">{edu.description}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No education added yet</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <AwardIcon className="h-5 w-5" />
              <h3 className="font-semibold">Certifications</h3>
              {isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => {
                    setProfile({
                      ...profile,
                      certifications: [
                        ...(profile.certifications || []),
                        { name: "", issuer: "", date: "" }
                      ]
                    });
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Certification
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {profile.certifications && profile.certifications.length > 0 ? (
                profile.certifications.map((cert, index) => (
                  <div key={index} className="flex items-start justify-between">
                    {isEditing ? (
                      <div className="w-full space-y-3">
                        <Input
                          value={cert.name}
                          onChange={(e) => {
                            const updatedCerts = [...profile.certifications];
                            updatedCerts[index].name = e.target.value;
                            setProfile({...profile, certifications: updatedCerts});
                          }}
                          placeholder="Certification name"
                        />
                        <Input
                          value={cert.issuer}
                          onChange={(e) => {
                            const updatedCerts = [...profile.certifications];
                            updatedCerts[index].issuer = e.target.value;
                            setProfile({...profile, certifications: updatedCerts});
                          }}
                          placeholder="Issuing organization"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={cert.date}
                            onChange={(e) => {
                              const updatedCerts = [...profile.certifications];
                              updatedCerts[index].date = e.target.value;
                              setProfile({...profile, certifications: updatedCerts});
                            }}
                            placeholder="Date (e.g. 2023)"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const updatedCerts = profile.certifications.filter((_, i) => i !== index);
                              setProfile({...profile, certifications: updatedCerts});
                            }}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="font-medium">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{cert.date}</span>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No certifications added yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}