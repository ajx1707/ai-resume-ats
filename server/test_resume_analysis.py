import requests
import json
import sys
import os

# Sample React developer resume text
REACT_RESUME = """
First Last
React Developer
Bismarck, North Dakota • +1-234-456-789 • professionalemail@resumeworded.com • linkedin.com/in/username

WORK EXPERIENCE
Resume Worded, New York, NY                                                                                 09/2015 – Present
Education technology startup with 50+ employees and $100m+ annual revenue
React Developer
• Decreased load times by 58% using isomorphic React and Node.js for 13 web applications one month after taking over the project.
• Partnered with a team of 5 developers to create 14 e-commerce websites using React and Node.JS in the first month on the job.
• Reduced the time spent on development by 73% by creating maintainable reusable components.
• Creates an interactive and user-friendly website experience by working with a team of 25 developers for the month.

Polyhire, London, United Kingdom                                                                           10/2012 – 08/2015
WYSE listed recruitment and employer branding company
Mobile Application Developer
• Created a web app used by 200K clients and generates $100K monthly within 20 days after inception.
• Devised a system to host mobile applications on a network of remote servers, leading to cost savings of $40K per month.
• Developed a video game idea for 2M children on Ubuntu-based PCs scaled for large TV displays across the country.

Growthist, London, United Kingdom                                                                          07/2010 – 09/2012
Career training and membership SaaS with 150,000 paying users
Mobile Developer
• Launched a new mobile app, BMI First, that generated 100K downloads and was featured in Time Magazine as the "App of the Year".
• Created a mobile game 'SpaceX' program that was downloaded 200K times and played by 5M people.
• Established Objective-C libraries & APIs, utilizing OOP and modeled data structures that can be used on 48 different apps.

UI Developer, ABC Company, London, United Kingdom                                                          10/2008 – 06/2009
Programmer, XYZ Company, London, United Kingdom                                                            07/2005 – 09/2008

EDUCATION
Resume Worded University, New York, NY                                                                     06/2005
Bachelor of Science – Computer Science

SKILLS
Hard Skills: SEO Integration (Advanced), Unit Testing (Experienced), TDD/BDD, UI Development, Debugging, Coding
Programming Languages: PHP, MySQL, MongoDB (Advanced), C++, Java, JSX, Angular, Sigma, DevOps, JUnit
"""

# Sample job description for a React developer position
REACT_JOB_DESCRIPTION = """
Senior React Developer

We are looking for a skilled React developer to join our team. The ideal candidate should have experience with React, JavaScript, and modern frontend development practices.

Responsibilities:
- Develop and maintain web applications using React
- Collaborate with the design team to implement user interfaces
- Write clean, maintainable, and efficient code
- Troubleshoot and debug applications
- Stay up-to-date with emerging trends and technologies

Requirements:
- 3+ years of experience with React
- Strong proficiency in JavaScript, HTML, and CSS
- Experience with state management libraries (Redux, MobX, etc.)
- Familiarity with RESTful APIs and GraphQL
- Knowledge of modern frontend build pipelines and tools
- Experience with testing frameworks
- Bachelor's degree in Computer Science or related field (or equivalent experience)
"""

# Sample job skills for a React developer position
REACT_JOB_SKILLS = [
    {"name": "React", "importance": 90},
    {"name": "JavaScript", "importance": 85},
    {"name": "HTML/CSS", "importance": 70},
    {"name": "Redux", "importance": 60},
    {"name": "Node.js", "importance": 50},
    {"name": "Testing", "importance": 40},
    {"name": "Git", "importance": 30}
]

def test_resume_analysis():
    """Test the resume analysis functionality"""
    # Get the JWT token from environment or command line
    token = os.environ.get("JWT_TOKEN")
    if not token and len(sys.argv) > 1:
        token = sys.argv[1]
    
    if not token:
        print("Please provide a JWT token as an environment variable JWT_TOKEN or as a command line argument")
        sys.exit(1)
    
    # Prepare the request data
    data = {
        "resume_text": REACT_RESUME,
        "job_skills": REACT_JOB_SKILLS,
        "job_description": REACT_JOB_DESCRIPTION
    }
    
    # Make the request to the test endpoint
    try:
        response = requests.post(
            "http://localhost:5000/api/test-resume-analysis",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=data
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            print("\n===== TEST RESULTS =====\n")
            print(f"Status: {response.status_code}")
            print(f"Message: {result.get('message')}")
            
            # Print the analysis result
            analysis = result.get('result', {})
            print(f"\nMatch score: {analysis.get('match_score', 0)}%")
            print(f"Matched skills: {analysis.get('matched_skills', [])}")
            print(f"Missing skills: {analysis.get('missing_skills', [])}")
            print(f"Suggestions: {analysis.get('suggestions', [])}")
            
            return True
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"Error making request: {str(e)}")
        return False

if __name__ == "__main__":
    test_resume_analysis()
