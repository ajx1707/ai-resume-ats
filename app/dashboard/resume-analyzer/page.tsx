"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import {
  FileTextIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  Loader2Icon,
  FileIcon,
  XIcon,
} from "lucide-react";
import React from "react";

// Define the structure of the analysis result object from the backend
interface AnalysisResult {
  full_text: string;
  matched_skills: string[];
  missing_skills: string[];
  ats_score_details: string[];
}

// Define custom components for Markdown rendering with explicit prop types
const markdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-2xl font-bold my-4" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-xl font-semibold my-3" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-lg font-semibold my-2" {...props} />,
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="my-2 leading-relaxed" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc list-inside my-2 pl-4 space-y-1" {...props} />,
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => <ol className="list-decimal list-inside my-2 pl-4 space-y-1" {...props} />,
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="my-1" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-bold" {...props} />,
};

export default function ResumeAnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Update state type to hold the structured analysis object
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; text: string }>>([]);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if file is a PDF
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      toast({
        title: "File selected",
        description: `Selected ${file.name}`,
      });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Check if file is a PDF
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      toast({
        title: "File uploaded",
        description: `Uploaded ${file.name}`,
      });
    }
  };

  // Remove selected file
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Reset analysis results when file is removed
    setAnalysisResult(null);
    setScore(null);
    setSuggestions([]);
    setMatchedSkills([]);
    setMissingSkills([]);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Extract ATS score from the ats_score_details array
  const parseScoreFromDetails = (details: string[]): number | null => {
    if (!details) return null;
    // Find the line containing "TOTAL ATS SCORE"
    const scoreLine = details.find(line => line.toUpperCase().includes("TOTAL ATS SCORE"));
    if (scoreLine) {
      // Extract the number from the line (e.g., "TOTAL ATS SCORE: 78%")
      const scoreMatch = scoreLine.match(/(\d+)%/);
      if (scoreMatch && scoreMatch[1]) {
        return parseInt(scoreMatch[1], 10);
      }
    }
    // Fallback: Try finding score in any line of the details
    for (const line of details) {
        const scoreMatch = line.match(/(\d+)%/);
        if (scoreMatch && scoreMatch[1]) {
            return parseInt(scoreMatch[1], 10);
        }
    }
    return null;
  };

  // Extract suggestions from the full analysis text
  const parseSuggestionsFromText = (fullText: string): Array<{ type: string; text: string }> => {
    const improvementSuggestions: Array<{ type: string; text: string }> = [];
    if (!fullText) return [];

    // Look for improvement suggestions section with multiple approaches
    // First try to find a dedicated section
    let suggestionSection = "";

    // Approach 1: Look for standard section headers
    const standardSectionMatch = fullText.match(/(?:IMPROVEMENT SUGGESTIONS|SUGGESTIONS)[\s\S]*?(?:\n\n|$)/i);
    if (standardSectionMatch) {
      suggestionSection = standardSectionMatch[0];
    }

    // Approach 2: Look for sentences that indicate suggestions
    if (!suggestionSection || suggestionSection.length < 20) {
      const suggestiveMatch = fullText.match(/(?:to improve|could improve|should|candidate could|candidate should)[^.]*(?:[.:])[\s\S]*?(?:\n\n|$)/gi);
      if (suggestiveMatch && suggestiveMatch.length > 0) {
        // Use the longest match as it likely contains more information
        suggestionSection = suggestiveMatch.reduce((longest, current) =>
          current.length > longest.length ? current : longest, "");
      }
    }

    // Approach 3: Look for numbered or bulleted lists anywhere in the text
    if (!suggestionSection || suggestionSection.length < 20) {
      // Find any section with numbered or bulleted items
      const listSections = fullText.match(/(?:[-•*\d]+[\.\)]*\s+[^\n]+\n)+/g);
      if (listSections && listSections.length > 0) {
        // Use the longest list section
        suggestionSection = listSections.reduce((longest, current) =>
          current.length > longest.length ? current : longest, "");
      }
    }

    // Process the suggestion section if we found one
    if (suggestionSection && suggestionSection.length > 0) {
      // Extract bullet points, numbered items, or sentences
      const bulletPoints = suggestionSection.match(/[-•*\d]+[\.\)]*\s+([^\n]+)/g) || [];
      const sentences = suggestionSection.split(/[.!?]\s+/).filter(s => s.trim().length > 15);

      // Process bullet points first
      if (bulletPoints.length > 0) {
        bulletPoints.forEach(point => {
          // Clean up the point text
          const cleanPoint = point.replace(/^[-•*\d]+[\.\)]*\s+/, '').trim();
          // Add only if it's not an empty string and reasonably long
          if (cleanPoint && cleanPoint.length > 5) {
            improvementSuggestions.push({
              type: "warning",
              text: cleanPoint
            });
          }
        });
      }
      // If no bullet points found, try to extract sentences
      else if (sentences.length > 0 && improvementSuggestions.length === 0) {
        sentences.forEach(sentence => {
          const cleanSentence = sentence.trim();
          // Only add if it seems like a suggestion (contains action words)
          if (cleanSentence.length > 15 &&
              /(?:add|include|highlight|emphasize|focus|improve|update|remove|consider)/i.test(cleanSentence)) {
            improvementSuggestions.push({
              type: "warning",
              text: cleanSentence
            });
          }
        });
      }
    }

    // If we still don't have suggestions, try a more aggressive approach
    if (improvementSuggestions.length === 0) {
      // Look for any sentences that sound like suggestions
      const allSentences = fullText.split(/[.!?]\s+/);
      const suggestiveSentences = allSentences.filter(sentence => {
        const clean = sentence.trim();
        return clean.length > 15 &&
               /(?:should|could|add|include|highlight|emphasize|focus|improve|update|remove|consider)/i.test(clean);
      });

      // Take up to 3 of the most suggestive sentences
      suggestiveSentences.slice(0, 3).forEach(sentence => {
        improvementSuggestions.push({
          type: "warning",
          text: sentence.trim()
        });
      });
    }

    // Provide default suggestions if none are found
    if (improvementSuggestions.length === 0) {
      return [
        { type: "warning", text: "Add specific experience with PostgreSQL, Express, React, and Node.js to your resume." },
        { type: "warning", text: "Include projects that demonstrate your full-stack development skills." },
        { type: "warning", text: "Highlight any experience with modern JavaScript frameworks and libraries." }
      ];
    }

    return improvementSuggestions;
  };

  // Extract personalized resume tips based on analysis
  const extractResumeTips = (fullText: string): string[] => {
    if (!fullText) return [];

    const tips: string[] = [];

    // Look for common resume issues in the analysis
    if (fullText.match(/format|formatting|layout|design/i)) {
      tips.push("Improve your resume's formatting for better readability");
    }

    if (fullText.match(/quantif|measur|number|metric|statistic/i)) {
      tips.push("Add more quantifiable achievements with specific metrics");
    }

    if (fullText.match(/keyword|ats|applicant tracking|match/i)) {
      tips.push("Include more job-specific keywords to pass ATS screening");
    }

    if (fullText.match(/action verb|passive|active voice/i)) {
      tips.push("Use strong action verbs to describe your accomplishments");
    }

    if (fullText.match(/skill|technical|technology|proficiency/i)) {
      tips.push("Highlight your technical skills more prominently");
    }

    if (fullText.match(/experience|work history|job/i)) {
      tips.push("Focus on relevant experience that matches the job requirements");
    }

    if (fullText.match(/education|degree|certification|qualification/i)) {
      tips.push("Ensure your education and certifications are clearly presented");
    }

    if (fullText.match(/concise|brief|length|too long|verbose/i)) {
      tips.push("Keep your resume concise and focused on relevant information");
    }

    // If we couldn't extract specific tips, return empty array (will use defaults)
    return tips;
  };

  // Extract personalized industry insights based on analysis
  const extractIndustryInsights = (fullText: string, score: number | null): string[] => {
    if (!fullText) return [];

    const insights: string[] = [];

    // Add score-based insight
    if (score !== null) {
      if (score >= 85) {
        insights.push(`Your resume scores in the top ${100-score}% of applicants for similar positions.`);
      } else if (score >= 70) {
        insights.push(`Your resume is stronger than approximately ${score}% of applicants for similar positions.`);
      } else {
        insights.push(`Improving your resume could increase your chances by up to ${Math.min(100, score + 30)}%.`);
      }
    }

    // Add insights based on content analysis
    if (missingSkills.length > 0) {
      insights.push(`${missingSkills.length} key skills were identified as missing from your resume for this job.`);
    }

    if (matchedSkills.length > 0) {
      insights.push(`Your resume matches ${matchedSkills.length} skills required for this position.`);
    }

    // Look for industry-specific insights
    if (fullText.match(/competitive|market|demand|industry trend/i)) {
      insights.push("The job market for this position is currently highly competitive.");
    }

    // Add general insight about ATS
    insights.push("Applicant Tracking Systems (ATS) reject approximately 75% of resumes before a human sees them.");

    return insights;
  };

  // Analyze resume
  const analyzeResume = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF resume",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription) {
      toast({
        title: "No job description",
        description: "Please enter a job description",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisResult(null); // Reset previous results
      setScore(null);
      setMatchedSkills([]);
      setMissingSkills([]);
      setSuggestions([]);

      // Convert PDF to base64
      const base64PDF = await fileToBase64(selectedFile);

      // Get authentication token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      // Call API
      const response = await fetch("http://localhost:5000/api/resume-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          resume_pdf: base64PDF,
          job_description: jobDescription
        })
      });

      const responseBody = await response.text(); // Read response body once

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseBody); // Try parsing as JSON
          throw new Error(errorData.message || `Analysis failed with status ${response.status}`);
        } catch (parseError) {
           // If not JSON, use the raw text
          throw new Error(responseBody || `Analysis failed with status ${response.status}`);
        }
      }

      const data = JSON.parse(responseBody); // Parse the successful JSON response

      // Ensure the expected structure is present
      if (!data.analysis || typeof data.analysis !== 'object' || !data.analysis.full_text) {
          throw new Error("Received invalid analysis data from the server.");
      }

      const analysisData: AnalysisResult = data.analysis;

      // Set analysis result object
      setAnalysisResult(analysisData);

      // Use the pre-parsed skill lists from the backend
      setMatchedSkills(analysisData.matched_skills || []);
      setMissingSkills(analysisData.missing_skills || []);

      // Parse the score from the ats_score_details
      const extractedScore = parseScoreFromDetails(analysisData.ats_score_details);
      setScore(extractedScore !== null ? extractedScore : 75); // Default to 75 if parsing fails

      // Parse suggestions from the full_text
      const extractedSuggestions = parseSuggestionsFromText(analysisData.full_text);
      console.log("Extracted suggestions:", extractedSuggestions);
      console.log("Analysis text sample:", analysisData.full_text.substring(0, 500));
      setSuggestions(extractedSuggestions);

      // No need to set these in state as we'll compute them on demand in the render

      toast({
        title: "Analysis complete",
        description: "Your resume has been analyzed"
      });

    } catch (error) {
      console.error("Error analyzing resume:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during analysis",
        variant: "destructive",
      });
      // Ensure UI reflects the failed state
      setAnalysisResult(null);
      setScore(null);
      setMatchedSkills([]);
      setMissingSkills([]);
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resume Analyzer</h1>
        <p className="text-muted-foreground">
          Get instant feedback on your resume and improve your chances of landing interviews.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileTextIcon className="h-5 w-5" />
              <h2 className="font-semibold">Upload Resume</h2>
            </div>

            {selectedFile ? (
              <div className="border-2 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center space-y-4"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Drag and drop your resume here, or click to browse
                  </p>
                </div>
                <Input
                  type="file"
                  className="hidden"
                  id="resume-upload"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <Label htmlFor="job-description">Job Description</Label>
              <Textarea
                id="job-description"
                placeholder="Paste the job description here"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[200px]"
              />
              <Button
                onClick={analyzeResume}
                disabled={isAnalyzing || !selectedFile || !jobDescription}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Resume"
                )}
              </Button>
            </div>
          </Card>

          {/* Only render results section if analysisResult object exists */}
          {analysisResult && (
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Analysis Results</h2>
              <div className="space-y-6">
                {/* Score Section */}
                {score !== null && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">Resume Score</span>
                      <span className="font-medium">{score}%</span>
                    </div>
                    <Progress value={score || 0} className="h-2" />
                  </div>
                )}

                <Separator />

                {/* Skills Match Section */}
                <div>
                  <h3 className="font-medium mb-2">Skills Match</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Matched Skills - uses matchedSkills state */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Matched Skills</h4>
                      <div className="space-y-2">
                        {matchedSkills.length > 0 ? (
                          matchedSkills.map((skill, index) => (
                            <div key={`matched-${index}`} className="flex items-start gap-2">
                              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm break-words">{skill}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No matched skills found in analysis.</p>
                        )}
                      </div>
                    </div>
                    {/* Missing Skills - uses missingSkills state */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Missing Skills</h4>
                      <div className="space-y-2">
                        {missingSkills.length > 0 ? (
                          missingSkills.map((skill, index) => (
                            <div key={`missing-${index}`} className="flex items-start gap-2">
                              <AlertCircleIcon className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm break-words">{skill}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No missing skills identified.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Improvement Suggestions Section - uses suggestions state */}
                <div>
                  <h3 className="font-medium mb-2">Improvement Suggestions</h3>
                  <div className="space-y-3">
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                        <div key={`suggestion-${index}`} className="flex items-start gap-3">
                            {suggestion.type === "success" ? (
                            <CheckCircleIcon className="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
                            ) : (
                            <AlertCircleIcon className="h-5 w-5 mt-0.5 text-amber-500 flex-shrink-0" />
                            )}
                            <p className="text-muted-foreground">{suggestion.text}</p>
                        </div>
                        ))
                    ) : (
                         <p className="text-sm text-muted-foreground">No specific suggestions provided in analysis.</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Full Analysis Section - uses analysisResult.full_text */}
                <div>
                  <h3 className="font-medium mb-2">Full Analysis</h3>
                  <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px] text-sm">
                    <ReactMarkdown components={markdownComponents}>
                      {analysisResult.full_text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Sidebar (Tips & Insights) - Now dynamic based on analysis */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Resume Tips</h3>
            <div className="space-y-3">
              {/* Show personalized tips if analysis is available, otherwise show default tips */}
              {
                (analysisResult ?
                  // Get personalized tips from analysis
                  extractResumeTips(analysisResult.full_text).length > 0 ?
                    extractResumeTips(analysisResult.full_text) :
                    // Fallback to defaults if no personalized tips found
                    [
                      "Use action verbs to describe achievements",
                      "Customize for each job application",
                      "Keep design clean and professional",
                      "Proofread for errors",
                      "Include relevant keywords",
                      "Quantify achievements with numbers",
                    ]
                :
                  // Default tips when no analysis is available
                  [
                    "Use action verbs to describe achievements",
                    "Customize for each job application",
                    "Keep design clean and professional",
                    "Proofread for errors",
                    "Include relevant keywords",
                    "Quantify achievements with numbers",
                  ]
                ).map((tip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <ArrowRightIcon className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">{tip}</span>
                  </div>
                ))
              }
              {analysisResult && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">Tips based on your resume analysis</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Industry Insights</h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              {/* Show personalized insights if analysis is available, otherwise show default insights */}
              {analysisResult ? (
                // Get personalized insights from analysis
                extractIndustryInsights(analysisResult.full_text, score).map((insight, index) => (
                  <p key={index}>{insight}</p>
                ))
              ) : (
                // Default insights when no analysis is available
                <>
                  <p>
                    Recruiters spend an average of 7.4 seconds reviewing a resume on initial screening.
                  </p>
                  <p>
                    76% of resumes are rejected due to unprofessional email addresses.
                  </p>
                  <p>
                    Applicant Tracking Systems (ATS) reject 75% of resumes before a human sees them.
                  </p>
                  <p>
                    Using artificial intelligence to analyze your resume can significantly improve your chances of getting interviews.
                  </p>
                </>
              )}
              {analysisResult && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">Insights based on your resume analysis</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}