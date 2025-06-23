"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NavigationBar } from "@/components/navigation-bar";
import { Briefcase, MapPin, Clock, Upload, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/axios";
import AuthGuard from "@/components/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

interface JobDetails {
  _id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: { name: string; weight: number }[];
  createdAt: string;
  active?: boolean;
}

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorLoading, setErrorLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>('idle');

  const jobId = params.id as string;

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setErrorLoading(false);
        const response = await api.get(`/jobs/${jobId}`);
        console.log('Fetched job details:', response.data);
        setJob(response.data.job);
      } catch (error) {
        console.error('Error fetching job details:', error);
        setErrorLoading(true);
        toast({
          title: "Error",
          description: "Failed to load job details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, toast]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleApply = async () => {
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
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
      });

      reader.readAsDataURL(resumeFile);
      const resumeData = await fileDataPromise;

      const applicationData = {
        resumeData,
        matchScore: 0
      };

      const response = await api.post(`/jobs/${jobId}/apply`, applicationData);
      console.log('Application submitted:', response.data);

      setApplicationStatus('success');
      toast({
        title: "Application Submitted",
        description: "Your job application has been successfully submitted!",
      });
    } catch (error: any) {
      console.error('Error applying for job:', error);
      setApplicationStatus('failed');
      toast({
        title: "Application Failed",
        description: error.response?.data?.error || "There was a problem submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  if (errorLoading) {
    return (
      <AuthGuard requiredRole="applicant">
        <div className="min-h-screen bg-background pb-20">
          <div className="max-w-4xl mx-auto p-4">
            <Card className="p-6 text-center">
              <CardContent>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  We could not find the job you are looking for. It may have been removed or is no longer available.
                </p>
                <Button onClick={() => router.push('/home/applicant')}>
                  Back to Jobs
                </Button>
              </CardContent>
            </Card>
          </div>
          <NavigationBar />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="applicant">
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto p-4">
          {loading ? (
            <JobSkeleton />
          ) : job ? (
            <>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1" />
                          {job.company}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(job.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">{job.description}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Required Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {job.skills && job.skills.length > 0 ? (
                        <div className="space-y-4">
                          {job.skills.map((skill, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{skill.name}</span>
                                <span>Importance: {skill.weight}%</span>
                              </div>
                              <Progress value={skill.weight} />
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
                                  aria-disabled={applying}
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
                      onClick={handleApply}
                      disabled={applying || !resumeFile}
                    >
                      {applying ? "Submitting Application..." : "Apply Now"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <NavigationBar />
      </div>
    </AuthGuard>
  );
}

function JobSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="w-full">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-8 w-8 rounded-full mb-2" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </>
  );
}
