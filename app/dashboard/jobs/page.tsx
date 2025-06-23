"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  BriefcaseIcon,
  MapPinIcon,
  BuildingIcon,
  CurrencyIcon,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  FileTextIcon,
  UserIcon,
  ClockIcon,
  Minus,
  Check,
  Upload,
  Download,
  AlertCircle as AlertCircleIcon,
  GraduationCap as GraduationCapIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Skill {
  name: string;
  importance: number;
  weight?: number; // For compatibility with page1, page2, page3
}

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
  description: string;
  skills: Skill[];
  posted_by: string;
  posted_at: string;
  applicants: Array<{
    user_id: string;
    resume: string;
    applied_at: string;
    status: string;
    applicantName?: string;
    applicantEmail?: string;
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    suggestions?: string[];
    analysis?: any;
  }>;
  status: string;
  active?: boolean;
}

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    }
  } catch (e) {
    return "Recently";
  }
};

// Format salary for display
const formatSalary = (salary: string) => {
  if (!salary) return "Not specified";

  // Check if it's a range (contains a dash)
  if (salary.includes('-')) {
    const [min, max] = salary.split('-').map(part => part.trim());
    return `$${formatCurrency(min)} - $${formatCurrency(max)}`;
  }

  // Single value
  return `$${formatCurrency(salary)}`;
};

// Helper to format currency values
const formatCurrency = (value: string) => {
  // Remove any non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');

  // Parse as float and format with commas
  const amount = parseFloat(numericValue);
  if (isNaN(amount)) return value;

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(amount);
};

export default function JobsPage() {
  const { toast } = useToast();
  const [userType, setUserType] = useState<"applicant" | "recruiter">("applicant");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>('idle');
  const [activeTab, setActiveTab] = useState<string>('details');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('');
  const [experienceLevelFilter, setExperienceLevelFilter] = useState<string>('');
  const [viewingResume, setViewingResume] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string>('resume.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    location: "",
    salary: "",
    type: "",
    experience: "",
    description: "",
    skills: [] as Skill[],
  });
  const [newSkill, setNewSkill] = useState({ name: "", importance: 50 });

  // Filter jobs based on search criteria
  const getFilteredJobs = () => {
    return jobs.filter(job => {
      // Search query filter (check title, company, description, and skills)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        job.title.toLowerCase().includes(searchLower) ||
        job.company.toLowerCase().includes(searchLower) ||
        job.description.toLowerCase().includes(searchLower) ||
        job.skills.some(skill => skill.name.toLowerCase().includes(searchLower));

      // Location filter - text-based search
      const matchesLocation = locationFilter === '' ||
        job.location.toLowerCase().includes(locationFilter.toLowerCase());

      // Job type filter
      const matchesJobType = jobTypeFilter === '' || jobTypeFilter === 'all' ||
        (job.type && job.type.toLowerCase() === jobTypeFilter.toLowerCase());

      // Experience level filter
      const matchesExperience = experienceLevelFilter === '' || experienceLevelFilter === 'all' ||
        (job.experience && job.experience.toLowerCase() === experienceLevelFilter.toLowerCase());

      return matchesSearch && matchesLocation && matchesJobType && matchesExperience;
    });
  };

  useEffect(() => {
    // Get user type from localStorage
    const userType = localStorage.getItem("userType");
    if (userType === "recruiter" || userType === "applicant") {
      setUserType(userType);
    }

    // Fetch jobs
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const userType = localStorage.getItem("userType") || "applicant";
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/jobs?user_type=${userType}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostJob = async () => {
    try {
      setIsPostingJob(true);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Validate required fields
      if (!newJob.title || !newJob.company || !newJob.location || !newJob.description) {
        throw new Error("Please fill in all required fields");
      }

      // Validate at least one skill
      if (newJob.skills.length === 0) {
        throw new Error("Please add at least one required skill");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/jobs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newJob)
      });

      if (!response.ok) {
        throw new Error("Failed to post job");
      }

      toast({
        title: "Success",
        description: "Job posted successfully",
      });

      // Reset form and refresh jobs
      setNewJob({
        title: "",
        company: "",
        location: "",
        salary: "",
        type: "",
        experience: "",
        description: "",
        skills: [],
      });
      fetchJobs();
    } catch (error) {
      console.error("Error posting job:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post job",
        variant: "destructive",
      });
    } finally {
      setIsPostingJob(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.name.trim() && newSkill.importance >= 0 && newSkill.importance <= 100) {
      setNewJob({
        ...newJob,
        skills: [...newJob.skills, { ...newSkill }]
      });
      setNewSkill({ name: "", importance: 50 });
    }
  };

  const handleRemoveSkill = (index: number) => {
    setNewJob({
      ...newJob,
      skills: newJob.skills.filter((_, i) => i !== index)
    });
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleApply = async (jobId: string) => {
    if (!resumeFile) {
      toast({
        title: "Resume Required",
        description: "Please upload your resume before applying.",
        variant: "destructive"
      });
      return;
    }

    setApplying(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Read the file as base64
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
      });

      reader.readAsDataURL(resumeFile);
      const resumeData = await fileDataPromise;

      // Send application with resume data
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume: resumeData,
          fileName: resumeFile.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to apply for job");
      }

      setApplicationStatus('success');
      toast({
        title: "Success",
        description: "Application submitted successfully",
      });

      // Refresh jobs list
      fetchJobs();
    } catch (error) {
      console.error("Error applying for job:", error);
      setApplicationStatus('failed');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to apply for job",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, jobId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: newStatus,
          job_id: jobId  // Include the job_id in the request
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the error message from the API
        toast({
          title: "Status Update Failed",
          description: data.message || "Failed to update application status",
          variant: "destructive",
        });
        return false;
      }

      // Status change was successful
      toast({
        title: "Success",
        description: data.message || `Application status updated to ${newStatus}`,
      });

      // Update local state
      const updatedJobs = jobs.map(job => {
        if (job._id === jobId) {
          return {
            ...job,
            applicants: job.applicants.map(app =>
              app.user_id === applicationId
                ? { ...app, status: newStatus }
                : app
            )
          };
        }
        return job;
      });

      setJobs(updatedJobs);

      // If we have a selected job open, update that too
      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob({
          ...selectedJob,
          applicants: selectedJob.applicants.map(app =>
            app.user_id === applicationId
              ? { ...app, status: newStatus }
              : app
          )
        });
      }

      return true;
    } catch (error) {
      console.error("Error updating application status:", error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
      return false;
    }
  };

  // Function to handle viewing a resume
  const handleViewResume = (resume: string, fileName: string = 'resume.pdf') => {
    setViewingResume(resume);
    setResumeFileName(fileName);
  };

  // Use the formatDate function defined at the top level

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {userType === "recruiter" ? "Manage Jobs" : "Find Your Next Role"}
          </h1>
          <p className="text-muted-foreground">
            {userType === "recruiter"
              ? "Post and manage your job listings"
              : "Discover opportunities that match your skills"}
          </p>
        </div>

        {userType === "recruiter" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg">
                <PlusIcon className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a New Job</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                    placeholder="e.g. Senior Frontend Developer"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newJob.company}
                    onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                    placeholder="Company name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                    placeholder="e.g. San Francisco, CA or Remote"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                    placeholder="e.g. $100k - $150k"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Job Type</Label>
                  <Select
                    value={newJob.type}
                    onValueChange={(value) => setNewJob({...newJob, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select
                    value={newJob.experience}
                    onValueChange={(value) => setNewJob({...newJob, experience: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                    placeholder="Describe the job responsibilities and requirements..."
                    className="min-h-[150px]"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Required Skills</Label>
                  <div className="space-y-2">
                    {newJob.skills.map((skill, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1">
                          {skill.name} ({skill.importance}%)
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSkill(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Skill name"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newSkill.importance}
                      onChange={(e) => setNewSkill({ ...newSkill, importance: parseInt(e.target.value) })}
                      className="w-24"
                    />
                    <Button onClick={handleAddSkill}>Add</Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button onClick={handlePostJob} disabled={isPostingJob}>
                  {isPostingJob ? "Posting..." : "Post Job"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedJob.title}</DialogTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center">
                    <BriefcaseIcon className="h-4 w-4 mr-1" />
                    {selectedJob.company}
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {selectedJob.location}
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(selectedJob.posted_at)}
                  </div>
                </div>
              </DialogHeader>

              {userType === "recruiter" ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="applicants">Applicants</TabsTrigger>
                    <TabsTrigger value="details">Job Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="applicants">
                    <Card>
                      <CardHeader>
                        <CardTitle>Applicants ({selectedJob.applicants?.length || 0})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedJob.applicants && selectedJob.applicants.length > 0 ? (
                          <div className="space-y-4">
                            {selectedJob.applicants.map((application, idx) => (
                              <Card key={idx} className="p-4">
                                <div className="flex flex-col md:flex-row justify-between">
                                  <div className="flex-1">
                                    <h3 className="font-semibold">{application.applicantName || `Applicant ${idx + 1}`}</h3>
                                    <p className="text-sm text-muted-foreground">{application.applicantEmail || 'Email not available'}</p>

                                    {/* Match Score with color indicator */}
                                    <div className="flex items-center mt-2">
                                      <span className="text-sm mr-2 font-medium">Match Score:</span>
                                      <Progress
                                        value={application.matchScore || 0}
                                        className="w-32"
                                      />
                                      <span className={`text-sm ml-2 font-medium ${application.matchScore && application.matchScore >= 80 ? 'text-green-600' :
                                          application.matchScore && application.matchScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {application.matchScore || 0}%
                                      </span>
                                    </div>
                                    {/* Debug info - remove after testing */}
                                    {application.matchScore === 0 && (
                                      <div className="text-xs text-amber-600 mt-1">
                                        <button
                                          onClick={() => console.log('Application data:', application)}
                                          className="underline"
                                        >
                                          Debug: Click to log application data
                                        </button>
                                      </div>
                                    )}

                                    {/* Skills Match Section */}
                                    {application.matchedSkills && application.matchedSkills.length > 0 && (
                                      <div className="mt-3">
                                        <h4 className="text-sm font-medium mb-1">Matched Skills:</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {application.matchedSkills.map((skill, skillIdx) => (
                                            <Badge key={skillIdx} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                                              {skill}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Missing Skills Section */}
                                    {application.missingSkills && application.missingSkills.length > 0 && (
                                      <div className="mt-2">
                                        <h4 className="text-sm font-medium mb-1">Missing Skills:</h4>
                                        <div className="flex flex-wrap gap-1">
                                          {application.missingSkills.map((skill, skillIdx) => (
                                            <Badge key={skillIdx} variant="outline" className="text-red-600 border-red-300">
                                              {skill}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Badge variant={
                                        application.status === "pending" ? "secondary" :
                                        application.status === "reviewed" ? "default" :
                                        application.status === "shortlisted" ? "default" : "destructive"
                                      }>
                                        {application.status === "shortlisted" && "✓ "}
                                        {application.status === "rejected" && "✕ "}
                                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                                        {(application.status === "shortlisted" || application.status === "rejected") && " (Final)"}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Applied {formatDate(application.applied_at)}
                                      </span>
                                    </div>
                                    {(application.status === "shortlisted" || application.status === "rejected") && (
                                      <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                                        <p>This application is in a final state and cannot be changed.</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col space-y-2 mt-4 md:mt-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewResume(application.resume, (application as any).fileName || 'resume.pdf')}
                                    >
                                      <FileTextIcon className="h-4 w-4 mr-1" /> View Resume
                                    </Button>
                                    {application.suggestions && application.suggestions.length > 0 && (
                                      <Button variant="outline" size="sm" className="text-amber-600">
                                        <AlertCircleIcon className="h-4 w-4 mr-1" /> View Suggestions
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant={application.status === "pending" ? "default" : "outline"}
                                    onClick={() => updateApplicationStatus(application.user_id, selectedJob._id, "pending")}
                                    disabled={application.status === "shortlisted" || application.status === "rejected"}
                                  >
                                    Pending
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={application.status === "reviewed" ? "default" : "outline"}
                                    onClick={() => updateApplicationStatus(application.user_id, selectedJob._id, "reviewed")}
                                    disabled={application.status === "shortlisted" || application.status === "rejected"}
                                  >
                                    Reviewed
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={application.status === "shortlisted" ? "default" : "outline"}
                                    onClick={() => updateApplicationStatus(application.user_id, selectedJob._id, "shortlisted")}
                                    disabled={application.status === "shortlisted" || application.status === "rejected"}
                                  >
                                    Shortlist
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={application.status === "rejected" ? "destructive" : "outline"}
                                    onClick={() => updateApplicationStatus(application.user_id, selectedJob._id, "rejected")}
                                    disabled={application.status === "shortlisted" || application.status === "rejected"}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <UserIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No applicants yet</h3>
                            <p className="text-muted-foreground">
                              When candidates apply for this job, they will appear here.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="details">
                    <div className="grid grid-cols-1 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Job Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="whitespace-pre-line">{selectedJob.description}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Required Skills</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedJob.skills && selectedJob.skills.length > 0 ? (
                            <div className="space-y-4">
                              {selectedJob.skills.map((skill, index) => (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>{skill.name}</span>
                                    <span>Importance: {skill.importance || skill.weight || 0}%</span>
                                  </div>
                                  <Progress value={skill.importance || skill.weight || 0} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No specific skills listed for this position.</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-line">{selectedJob.description}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Required Skills</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedJob.skills && selectedJob.skills.length > 0 ? (
                          <div className="space-y-4">
                            {selectedJob.skills.map((skill, index) => (
                              <div key={index} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{skill.name}</span>
                                  <span>Importance: {skill.importance || skill.weight || 0}%</span>
                                </div>
                                <Progress value={skill.importance || skill.weight || 0} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No specific skills listed for this position.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <Card className="mb-6">
                      <CardHeader>
                        <CardTitle>Upload Resume</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {applicationStatus === 'success' ? (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <Check className="h-12 w-12 text-primary mb-2" />
                              <h3 className="text-lg font-semibold">Application Submitted!</h3>
                              <p className="text-muted-foreground">
                                Your application has been successfully submitted. The recruiter will contact you if your profile matches their requirements.
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={handleResumeUpload}
                                    disabled={applying || applicationStatus === 'success'}
                                    ref={fileInputRef}
                                  />
                                  <div className="flex flex-col items-center">
                                    {resumeFile ? (
                                      <>
                                        <Check className="h-8 w-8 mb-2 text-primary" />
                                        <span className="text-sm font-medium">{resumeFile.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Click to change
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-8 w-8 mb-2" />
                                        <span className="text-sm text-muted-foreground">
                                          Upload your resume (PDF, DOC, DOCX)
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {applicationStatus !== 'success' && (
                      <Button
                        className="w-full"
                        onClick={() => handleApply(selectedJob._id)}
                        disabled={applying || !resumeFile}
                      >
                        {applying ? "Submitting Application..." : "Apply Now"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resume Viewer Dialog */}
      <Dialog open={!!viewingResume} onOpenChange={(open) => !open && setViewingResume(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resume - {resumeFileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {viewingResume && (
              <iframe
                src={viewingResume}
                className="w-full h-[70vh] border rounded"
                title="Resume Viewer"
              />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setViewingResume(null)}
            >
              Close
            </Button>
            <Button
              className="ml-2"
              onClick={() => {
                // Create a temporary anchor element to download the file
                const a = document.createElement('a');
                a.href = viewingResume as string;
                a.download = resumeFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <Card className="p-4 h-fit">
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Search</h2>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="font-semibold mb-2">Location</h2>
              <div className="relative">
                <MapPinIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 pr-8"
                  placeholder="Enter location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
                {locationFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 py-0"
                    onClick={() => setLocationFilter('')}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Job Type</h2>
              <Select value={jobTypeFilter || "all"} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <h2 className="font-semibold mb-2">Experience Level</h2>
              <Select value={experienceLevelFilter || "all"} onValueChange={setExperienceLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">
                {userType === "recruiter"
                  ? "No jobs posted yet. Click 'Post New Job' to create your first listing."
                  : "No jobs available at the moment. Please check back later."}
              </p>
            </Card>
          ) : (
            // Use filtered jobs instead of all jobs
            getFilteredJobs().length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  No jobs match your search criteria. Try adjusting your filters.
                </p>
              </Card>
            ) : (
              getFilteredJobs().map((job) => (
              <Card key={job._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <div className="flex items-center text-muted-foreground">
                      <BuildingIcon className="mr-1 h-4 w-4" />
                      {job.company}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedJob(job);
                        setShowJobDetails(true);
                        // Reset application state when viewing a new job
                        setResumeFile(null);
                        setApplicationStatus('idle');
                        setActiveTab('details');
                      }}
                    >
                      View Details
                    </Button>
                    {userType === "recruiter" ? (
                      <Button variant="outline" size="sm" className="text-destructive">
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedJob(job);
                          setShowJobDetails(true);
                          // Reset application state when viewing a new job
                          setResumeFile(null);
                          setApplicationStatus('idle');
                          setActiveTab('details');
                        }}
                      >
                        Apply Now
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-between">
                  <div className="flex items-center text-muted-foreground mr-4 mb-2">
                    <MapPinIcon className="mr-1 h-4 w-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <CurrencyIcon className="mr-1 h-4 w-4" />
                    {formatSalary(job.salary)}
                  </div>
                  <div className="flex items-center text-muted-foreground mr-4 mb-2">
                    <ClockIcon className="mr-1 h-4 w-4" />
                    {job.type || 'Full-time'}
                  </div>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <GraduationCapIcon className="mr-1 h-4 w-4" />
                    {job.experience || 'Entry Level'}
                  </div>
                </div>

                <p className="mt-4 text-muted-foreground line-clamp-2">{job.description}</p>

                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill.name} ({skill.importance || skill.weight || 0}%)
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Posted {formatDate(job.posted_at)}</span>
                  <span>{job.applicants?.length || 0} applicants</span>
                </div>

                {userType === "recruiter" && job.applicants?.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Applicants</h4>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {job.applicants.length} {job.applicants.length === 1 ? 'applicant' : 'applicants'}
                      </Badge>
                    </div>
                    <button
                      className="mt-2 w-full flex items-center justify-center py-2.5 px-4 bg-background hover:bg-background/90 border border-border rounded-md text-sm font-medium text-foreground"
                      onClick={() => {
                        setSelectedJob(job);
                        setShowJobDetails(true);
                        setActiveTab("applicants");
                      }}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      View All Applicants
                    </button>
                  </div>
                )}
              </Card>
            )))
          )}
        </div>
      </div>
    </div>
  );
}