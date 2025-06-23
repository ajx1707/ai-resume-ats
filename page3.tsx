"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { NavigationBar } from "@/components/navigation-bar";
import { Plus, Minus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/axios";
import AuthGuard from "@/components/auth-guard";

interface Skill {
  name: string;
  weight: number;
}

export default function PostJobPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<Skill[]>([{ name: "", weight: 50 }]);
  const [loading, setLoading] = useState(false);

  const handleAddSkill = () => {
    setSkills([...skills, { name: "", weight: 50 }]);
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSkillChange = (index: number, field: keyof Skill, value: string | number) => {
    const newSkills = [...skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setSkills(newSkills);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Filter out empty skills
      const validSkills = skills.filter(skill => skill.name.trim() !== "");
      
      // Create job data object
      const jobData = {
        title,
        company,
        location,
        description,
        skills: validSkills
      };
      
      console.log("Posting job with data:", jobData);
      
      // Send API request to create job
      const response = await api.post('/jobs', jobData);
      
      console.log("Job posted successfully:", response.data);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Job posted successfully!",
      });
      
      // Redirect to recruiter home page
      router.push("/home/recruiter");
    } catch (error: any) {
      console.error("Error posting job:", error);
      console.error("Error response:", error.response?.data);
      
      // Show error toast
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to post job. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRole="recruiter">
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>Post a New Job</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Input
                    placeholder="Job Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Company Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Job Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Required Skills</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSkill}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4" />
                      Add Skill
                    </Button>
                  </div>

                  {skills.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Skill name"
                          value={skill.name}
                          onChange={(e) =>
                            handleSkillChange(index, "name", e.target.value)
                          }
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveSkill(index)}
                          disabled={loading || skills.length === 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Importance</span>
                          <span>{skill.weight}%</span>
                        </div>
                        <Slider
                          value={[skill.weight]}
                          onValueChange={(value) =>
                            handleSkillChange(index, "weight", value[0])
                          }
                          max={100}
                          step={1}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Posting..." : "Post Job"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <NavigationBar />
      </div>
    </AuthGuard>
  );
}