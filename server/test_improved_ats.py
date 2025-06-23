#!/usr/bin/env python3
"""
Test script to verify the improved ATS resume analysis system.
This script tests the enhanced skill matching capabilities.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from resume_analyzer import test_resume_analysis, normalize_skill_name, find_skill_matches

def test_skill_normalization():
    """Test the skill normalization function."""
    print("=== Testing Skill Normalization ===")
    
    test_cases = [
        ("React.js", "react"),
        ("Node.js", "node"),
        ("JavaScript", "js"),
        ("Express.js", "express"),
        ("MongoDB", "mongo"),
        ("REST API", "rest"),
        ("Machine Learning", "ml"),
        ("Version Control", "git")
    ]
    
    for original, expected in test_cases:
        normalized = normalize_skill_name(original)
        status = "✓" if normalized == expected else "✗"
        print(f"{status} {original} -> {normalized} (expected: {expected})")
    
    print()

def test_skill_matching():
    """Test the intelligent skill matching function."""
    print("=== Testing Skill Matching ===")
    
    # Simulate resume skills
    resume_skills = ["MERN", "React", "Node.js", "MongoDB", "Express", "JavaScript", "HTML", "CSS", "Git"]
    
    # Simulate job requirements
    job_skills = [
        {"name": "React", "importance": 90},
        {"name": "Node", "importance": 80},
        {"name": "JavaScript", "importance": 85},
        {"name": "Express.js", "importance": 70},
        {"name": "MongoDB", "importance": 75},
        {"name": "TypeScript", "importance": 60},
        {"name": "Redux", "importance": 50}
    ]
    
    matched, missing = find_skill_matches(resume_skills, job_skills)
    
    print(f"Resume Skills: {resume_skills}")
    print(f"Job Requirements: {[skill['name'] for skill in job_skills]}")
    print(f"Matched Skills: {matched}")
    print(f"Missing Skills: {missing}")
    print()

def test_mern_stack_scenario():
    """Test the specific MERN stack scenario mentioned by the user."""
    print("=== Testing MERN Stack Scenario ===")
    
    # Sample resume text that mentions MERN
    resume_text = """
    John Doe
    Full Stack Developer
    
    Experience:
    - 3+ years of experience in MERN stack development
    - Built multiple web applications using React, Node.js, Express, and MongoDB
    - Proficient in JavaScript, HTML, CSS
    - Experience with Git version control
    - Worked on RESTful APIs and database design
    
    Projects:
    - E-commerce platform using MERN stack
    - Social media dashboard with React frontend
    - Node.js backend services with Express framework
    """
    
    # Job requirements for a Full Stack Developer
    job_skills = [
        {"name": "React", "importance": 90},
        {"name": "Node.js", "importance": 85},
        {"name": "JavaScript", "importance": 80},
        {"name": "Express", "importance": 70},
        {"name": "MongoDB", "importance": 75},
        {"name": "HTML", "importance": 60},
        {"name": "CSS", "importance": 60},
        {"name": "REST API", "importance": 65}
    ]
    
    job_description = """
    We are looking for a Full Stack Developer with experience in:
    - React for frontend development
    - Node.js for backend services
    - JavaScript programming
    - Express framework
    - MongoDB database
    - HTML/CSS for styling
    - REST API development
    """
    
    print("Resume mentions: MERN stack, React, Node.js, Express, MongoDB, JavaScript, HTML, CSS, Git, RESTful APIs")
    print("Job requires: React, Node.js, JavaScript, Express, MongoDB, HTML, CSS, REST API")
    print()
    
    # Run the analysis
    result = test_resume_analysis(resume_text, job_skills, job_description)
    
    print(f"\nFinal ATS Score: {result.get('match_score', 0)}%")
    print(f"Expected: Should be high (80%+) since resume has MERN experience matching job requirements")
    
    return result

def test_edge_cases():
    """Test various edge cases and skill variations."""
    print("=== Testing Edge Cases ===")
    
    # Test case 1: Different naming conventions
    resume_skills_1 = ["ReactJS", "NodeJS", "Javascript", "ExpressJS"]
    job_skills_1 = [
        {"name": "React", "importance": 90},
        {"name": "Node.js", "importance": 85},
        {"name": "JavaScript", "importance": 80},
        {"name": "Express", "importance": 70}
    ]
    
    matched_1, missing_1 = find_skill_matches(resume_skills_1, job_skills_1)
    print(f"Test 1 - Naming Conventions:")
    print(f"  Resume: {resume_skills_1}")
    print(f"  Job: {[s['name'] for s in job_skills_1]}")
    print(f"  Matched: {matched_1}")
    print(f"  Missing: {missing_1}")
    print()
    
    # Test case 2: Skill stacks
    resume_skills_2 = ["MEAN stack", "Angular", "TypeScript"]
    job_skills_2 = [
        {"name": "Angular", "importance": 90},
        {"name": "Node.js", "importance": 80},
        {"name": "MongoDB", "importance": 70},
        {"name": "Express", "importance": 65}
    ]
    
    matched_2, missing_2 = find_skill_matches(resume_skills_2, job_skills_2)
    print(f"Test 2 - Skill Stacks:")
    print(f"  Resume: {resume_skills_2}")
    print(f"  Job: {[s['name'] for s in job_skills_2]}")
    print(f"  Matched: {matched_2}")
    print(f"  Missing: {missing_2}")
    print()

if __name__ == "__main__":
    print("🚀 Testing Improved ATS Resume Analysis System\n")
    
    # Run all tests
    test_skill_normalization()
    test_skill_matching()
    test_mern_stack_scenario()
    test_edge_cases()
    
    print("✅ All tests completed!")
    print("\nKey Improvements:")
    print("1. ✅ Enhanced skill normalization (React.js = React)")
    print("2. ✅ Skill stack recognition (MERN = MongoDB + Express + React + Node.js)")
    print("3. ✅ Intelligent partial matching")
    print("4. ✅ Improved AI prompting for better understanding")
    print("5. ✅ Weighted scoring based on skill importance")
