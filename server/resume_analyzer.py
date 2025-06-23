import os
import re
from groq import Groq
import PyPDF2
import base64
import tempfile
import json

def normalize_skill_name(skill):
    """
    Normalize skill names for better matching.
    """
    if not skill:
        return ""

    # Convert to lowercase and remove extra spaces
    normalized = skill.lower().strip()

    # Common normalizations
    normalizations = {
        'react.js': 'react',
        'reactjs': 'react',
        'node.js': 'node',
        'nodejs': 'node',
        'express.js': 'express',
        'expressjs': 'express',
        'vue.js': 'vue',
        'vuejs': 'vue',
        'angular.js': 'angular',
        'angularjs': 'angular',
        'mongodb': 'mongo',
        'postgresql': 'postgres',
        'html5': 'html',
        'css3': 'css',
        'rest api': 'rest',
        'restful api': 'rest',
        'machine learning': 'ml',
        'artificial intelligence': 'ai',
        'version control': 'git',
        'source control': 'git'
    }

    # Apply normalizations
    for original, normalized_form in normalizations.items():
        if original in normalized:
            normalized = normalized.replace(original, normalized_form)

    # Remove common suffixes/prefixes
    normalized = re.sub(r'\b(framework|library|js|lang|language)\b', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized).strip()

    return normalized

def find_skill_matches(resume_skills, job_skills):
    """
    Find matches between resume skills and job skills using intelligent matching.
    """
    matched_skills = []
    missing_skills = []

    # Normalize all skills
    normalized_resume_skills = {normalize_skill_name(skill): skill for skill in resume_skills}

    for job_skill in job_skills:
        job_skill_name = job_skill.get('name', '') if isinstance(job_skill, dict) else str(job_skill)
        normalized_job_skill = normalize_skill_name(job_skill_name)

        is_matched = False

        # Check for direct normalized match
        if normalized_job_skill in normalized_resume_skills:
            matched_skills.append(job_skill_name)
            is_matched = True
        else:
            # Check for partial matches
            for norm_resume_skill in normalized_resume_skills.keys():
                if (normalized_job_skill in norm_resume_skill or
                    norm_resume_skill in normalized_job_skill or
                    len(set(normalized_job_skill.split()) & set(norm_resume_skill.split())) > 0):
                    matched_skills.append(job_skill_name)
                    is_matched = True
                    break

        if not is_matched:
            missing_skills.append(job_skill_name)

    return matched_skills, missing_skills

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file with improved formatting handling."""
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text() or ""
                # Normalize whitespace to improve text processing
                page_text = re.sub(r'\s+', ' ', page_text)
                text += page_text + "\n\n"  # Add double newline between pages for better separation

            if not text.strip():
                raise ValueError("No text could be extracted from the PDF. It might be a scanned image.")

            # Clean up the text to improve skill extraction
            # Replace bullet points and other special characters with spaces
            text = re.sub(r'[•●■◆▪▫◦○●]', ' ', text)
            # Normalize whitespace again after cleaning
            text = re.sub(r'\s+', ' ', text)

            return text
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

def analyze_resume_for_job_match(resume_text, job_skills, job_description):
    """
    Analyze resume against job requirements using Deepseek R1 Distill LLama 72B via Groq API.

    Args:
        resume_text: Extracted text from the resume
        job_skills: List of skills required for the job with importance weights
        job_description: Full job description

    Returns:
        Dictionary with match score and analysis details
    """
    # Set Groq API key
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

    client = Groq(api_key=GROQ_API_KEY)

    # Format job skills for the prompt
    formatted_skills = "\n".join([f"- {skill['name']} (Importance: {skill.get('weight', skill.get('importance', 50))}%)" for skill in job_skills])

    # Preprocess resume text to improve skill extraction
    # Remove extra whitespace and normalize line breaks
    resume_text = " ".join(resume_text.split())

    # Comprehensive skill database with variations and aliases
    common_tech_skills = [
        # Frontend Technologies
        "React", "React.js", "ReactJS", "React Native", "JavaScript", "TypeScript", "HTML", "CSS", "SCSS", "SASS",
        "Angular", "AngularJS", "Vue", "Vue.js", "Svelte", "jQuery", "Bootstrap", "Tailwind CSS", "Material UI",
        "Redux", "MobX", "Zustand", "Context API", "Next.js", "Nuxt.js", "Gatsby", "Webpack", "Vite", "Parcel",

        # Backend Technologies
        "Node.js", "Express", "Express.js", "Koa", "Fastify", "NestJS", "Socket.io",
        "Python", "Django", "Flask", "FastAPI", "Tornado", "Pyramid",
        "Java", "Spring", "Spring Boot", "Hibernate", "Maven", "Gradle",
        "C#", "ASP.NET", ".NET", ".NET Core", "Entity Framework",
        "PHP", "Laravel", "Symfony", "CodeIgniter", "Zend",
        "Ruby", "Ruby on Rails", "Sinatra",
        "Go", "Gin", "Echo", "Fiber",
        "Rust", "Actix", "Rocket", "Warp",
        "C++", "C", "Swift", "Kotlin", "Scala", "Clojure", "Elixir", "Erlang",

        # Databases
        "MongoDB", "MySQL", "PostgreSQL", "SQLite", "Redis", "Cassandra", "DynamoDB", "Firebase",
        "SQL", "NoSQL", "GraphQL", "Prisma", "Mongoose", "Sequelize", "TypeORM",

        # Cloud & DevOps
        "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Jenkins", "CI/CD",
        "Terraform", "Ansible", "Chef", "Puppet", "Nginx", "Apache", "Linux", "Ubuntu", "CentOS",

        # Mobile Development
        "Flutter", "Dart", "iOS", "Android", "Swift", "Objective-C", "Kotlin", "Java",
        "React Native", "Xamarin", "Ionic", "Cordova", "PhoneGap",

        # Data Science & AI
        "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy", "Matplotlib", "Seaborn",
        "Jupyter", "R", "MATLAB", "Spark", "Hadoop", "Kafka",

        # Tools & Others
        "Git", "GitHub", "GitLab", "Bitbucket", "SVN", "REST API", "SOAP", "Microservices",
        "Agile", "Scrum", "Kanban", "JIRA", "Confluence", "Slack", "Teams",
        "Unity", "Unreal Engine", "Blender", "Photoshop", "Figma", "Sketch"
    ]

    # Enhanced skill relationships and equivalencies
    skill_relationships = {
        # Frontend Frameworks and their dependencies
        "React": ["JavaScript", "HTML", "CSS", "JSX"],
        "React.js": ["JavaScript", "HTML", "CSS", "JSX"],
        "ReactJS": ["JavaScript", "HTML", "CSS", "JSX"],
        "React Native": ["React", "JavaScript", "Mobile Development"],
        "Angular": ["TypeScript", "HTML", "CSS", "RxJS"],
        "AngularJS": ["JavaScript", "HTML", "CSS"],
        "Vue": ["JavaScript", "HTML", "CSS"],
        "Vue.js": ["JavaScript", "HTML", "CSS"],
        "Next.js": ["React", "JavaScript", "Node.js"],
        "Nuxt.js": ["Vue", "JavaScript", "Node.js"],

        # Backend Frameworks and their dependencies
        "Express": ["Node.js", "JavaScript"],
        "Express.js": ["Node.js", "JavaScript"],
        "NestJS": ["Node.js", "TypeScript"],
        "Django": ["Python"],
        "Flask": ["Python"],
        "FastAPI": ["Python"],
        "Spring": ["Java"],
        "Spring Boot": ["Java", "Spring"],
        "ASP.NET": ["C#"],
        ".NET": ["C#"],
        ".NET Core": ["C#"],
        "Laravel": ["PHP"],
        "Ruby on Rails": ["Ruby"],

        # Mobile Development
        "Flutter": ["Dart", "Mobile Development"],
        "iOS": ["Swift", "Objective-C", "Mobile Development"],
        "Android": ["Java", "Kotlin", "Mobile Development"],
        "Xamarin": ["C#", "Mobile Development"],

        # Data Science
        "TensorFlow": ["Python", "Machine Learning"],
        "PyTorch": ["Python", "Machine Learning"],
        "Pandas": ["Python", "Data Analysis"],
        "NumPy": ["Python", "Data Analysis"],
        "Scikit-learn": ["Python", "Machine Learning"],

        # Database relationships
        "MongoDB": ["NoSQL", "Database"],
        "MySQL": ["SQL", "Database"],
        "PostgreSQL": ["SQL", "Database"],
        "Redis": ["NoSQL", "Caching"],

        # Cloud platforms
        "AWS": ["Cloud Computing"],
        "Azure": ["Cloud Computing"],
        "GCP": ["Cloud Computing"],
        "Google Cloud": ["Cloud Computing"],

        # DevOps
        "Docker": ["Containerization", "DevOps"],
        "Kubernetes": ["Container Orchestration", "DevOps"],
        "Jenkins": ["CI/CD", "DevOps"],
        "Terraform": ["Infrastructure as Code", "DevOps"]
    }

    # Skill equivalencies and aliases - skills that mean the same thing
    skill_equivalencies = {
        "MERN": ["MongoDB", "Express", "React", "Node.js"],
        "MEAN": ["MongoDB", "Express", "Angular", "Node.js"],
        "LAMP": ["Linux", "Apache", "MySQL", "PHP"],
        "JAMstack": ["JavaScript", "API", "Markup"],
        "Full Stack": ["Frontend", "Backend", "Database"],
        "Frontend": ["HTML", "CSS", "JavaScript"],
        "Backend": ["Server-side", "API", "Database"],
        "DevOps": ["CI/CD", "Docker", "Kubernetes"],
        "Machine Learning": ["ML", "AI", "Data Science"],
        "Artificial Intelligence": ["AI", "Machine Learning"],
        "UI/UX": ["User Interface", "User Experience", "Design"],
        "REST": ["REST API", "RESTful API"],
        "GraphQL": ["Graph Query Language"],
        "SQL": ["Structured Query Language", "Database"],
        "NoSQL": ["Non-relational Database"],
        "Git": ["Version Control", "Source Control"],
        "Agile": ["Scrum", "Kanban", "Agile Methodology"]
    }

    # Extract skills from resume text using regex
    extracted_skills = []
    for skill in common_tech_skills:
        # Create regex pattern that matches the skill as a whole word, case insensitive
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, resume_text, re.IGNORECASE):
            extracted_skills.append(skill)

    # Check for skill equivalencies (like MERN, MEAN, etc.)
    for equiv_skill, component_skills in skill_equivalencies.items():
        # Create more flexible patterns for skill stacks
        patterns = [
            r'\b' + re.escape(equiv_skill) + r'\b',
            r'\b' + re.escape(equiv_skill) + r'\s+stack\b',
            r'\b' + re.escape(equiv_skill.lower()) + r'\b',
            r'\b' + re.escape(equiv_skill.upper()) + r'\b'
        ]

        found = False
        for pattern in patterns:
            if re.search(pattern, resume_text, re.IGNORECASE):
                found = True
                break

        if found:
            # Add the equivalent skill and all its components
            if equiv_skill not in extracted_skills:
                extracted_skills.append(equiv_skill)
            for component in component_skills:
                if component not in extracted_skills:
                    extracted_skills.append(component)

    # Add implied skills based on skill relationships
    implied_skills = []
    for skill in extracted_skills:
        if skill in skill_relationships:
            for related_skill in skill_relationships[skill]:
                if related_skill not in extracted_skills and related_skill not in implied_skills:
                    implied_skills.append(related_skill)

    # Add implied skills to extracted skills
    extracted_skills.extend(implied_skills)

    # Create a structured prompt for the AI
    prompt = f"""
You are an expert ATS (Applicant Tracking System) analyzer with deep knowledge of technology stacks and skill relationships. Your task is to intelligently analyze a resume against specific job requirements.

RESUME TEXT:
{resume_text[:3000]}

JOB DESCRIPTION:
{job_description[:1000]}

REQUIRED SKILLS (with importance weights):
{formatted_skills}

I've already identified these skills in the resume: {', '.join(extracted_skills)}

IMPORTANT SKILL MATCHING GUIDELINES:
1. **Technology Stack Understanding**:
   - If someone mentions "MERN", they know MongoDB, Express, React, and Node.js
   - If someone mentions "Full Stack Developer", they likely know both frontend and backend technologies
   - React developers typically know JavaScript, HTML, CSS by default
   - Backend developers with Node.js experience typically know JavaScript

2. **Skill Equivalencies**: Consider these as matches:
   - "React" matches "React.js", "ReactJS", "React Native"
   - "Node" matches "Node.js", "NodeJS"
   - "JavaScript" matches "JS", "ECMAScript", "ES6+"
   - "MongoDB" matches "Mongo", "NoSQL database experience"
   - "Express" matches "Express.js", "ExpressJS"
   - "Full Stack" implies both frontend and backend skills

3. **Experience-Based Inference**:
   - If someone has "3+ years React experience", they definitely know JavaScript, HTML, CSS
   - If someone built "MERN stack applications", they know all MERN technologies
   - If someone mentions specific projects using technologies, count those as skills

4. **Contextual Understanding**:
   - Look for skills mentioned in project descriptions, work experience, and education
   - Consider variations in how skills are written (case sensitivity, abbreviations)
   - Understand that senior developers may not list basic skills explicitly

Please analyze the resume and provide the following information in JSON format:
1. Extract ALL skills mentioned in the resume (including inferred ones from experience and projects)
2. For each required job skill, determine if it's present (including equivalent/related skills)
3. Calculate a match score (0-100) based on the importance weights of matched skills
4. Provide comprehensive lists of matched and missing skills
5. Suggest specific improvements for the resume

Return your analysis in the following JSON format:
{{
  "extracted_skills": ["skill1", "skill2", ...],
  "skill_matches": [
    {{ "job_skill": "skill name", "present": true/false, "importance": 0-100, "evidence": "specific text from resume showing this skill or experience" }}
  ],
  "match_score": 0-100,
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill3", "skill4", ...],
  "suggestions": ["specific actionable suggestion1", "specific actionable suggestion2", ...]
}}

Be intelligent, thorough, and generous in your skill matching while maintaining accuracy.
"""

    try:
        # Call Groq API with Llama 3 70B model (same as used in the resume analyzer page)
        response = client.chat.completions.create(
            model="llama3-70b-8192",  # Use Llama 3 70B model which is working in the resume analyzer page
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        # Parse the JSON response
        analysis_text = response.choices[0].message.content
        analysis_data = json.loads(analysis_text)

        # Apply fallback logic for match score
        # If the resume has relevant job titles but low match score, apply a minimum score
        job_title_keywords = ["react", "frontend", "front-end", "front end", "developer", "engineer", "flutter", "mobile"]
        has_relevant_title = False

        # Check if resume contains relevant job titles
        for keyword in job_title_keywords:
            if keyword.lower() in resume_text.lower():
                has_relevant_title = True
                break

        # If match score is suspiciously low but resume has relevant experience, apply minimum score
        if has_relevant_title and analysis_data.get("match_score", 0) < 40:
            print(f"Applying minimum match score. Original score: {analysis_data.get('match_score', 0)}")
            analysis_data["match_score"] = max(analysis_data.get("match_score", 0), 40)

            # Add explanation to suggestions
            if "suggestions" not in analysis_data:
                analysis_data["suggestions"] = []
            analysis_data["suggestions"].append(
                "Your resume contains relevant job titles and experience, but you should explicitly list more of the required skills."
            )

        # Process matched and missing skills using our enhanced matching logic
        ai_matched_skills = analysis_data.get("matched_skills", [])

        # Use our intelligent skill matching as a backup/enhancement
        all_resume_skills = analysis_data.get("extracted_skills", extracted_skills)
        intelligent_matched, _ = find_skill_matches(all_resume_skills, job_skills)

        # Combine AI results with our intelligent matching
        combined_matched = list(set(ai_matched_skills + intelligent_matched))
        combined_missing = [skill for skill in [s['name'] if isinstance(s, dict) else s for s in job_skills]
                           if skill not in combined_matched]

        # Add implied skills to matched skills
        implied_matched = []
        for skill in combined_matched:
            if skill in skill_relationships:
                for related_skill in skill_relationships[skill]:
                    if related_skill in combined_missing and related_skill not in implied_matched:
                        implied_matched.append(related_skill)

        # Remove implied skills from missing skills and add to matched skills
        for skill in implied_matched:
            if skill in combined_missing:
                combined_missing.remove(skill)
                if skill not in combined_matched:
                    combined_matched.append(skill)

        # Update the analysis data
        analysis_data["matched_skills"] = combined_matched
        analysis_data["missing_skills"] = combined_missing

        # Recalculate match score if needed based on new matched skills
        if implied_matched and analysis_data.get("match_score", 0) < 80:
            # Increase match score by 5% for each implied skill that was moved from missing to matched
            # but cap the increase at 20%
            score_increase = min(len(implied_matched) * 5, 20)
            new_score = min(analysis_data.get("match_score", 0) + score_increase, 95)  # Cap at 95%
            analysis_data["match_score"] = new_score

            # Add explanation to suggestions
            if "suggestions" not in analysis_data:
                analysis_data["suggestions"] = []
            analysis_data["suggestions"].append(
                f"Your knowledge of {', '.join(combined_matched)} implies familiarity with {', '.join(implied_matched)}."
            )

        return analysis_data

    except Exception as e:
        print(f"Error with Groq API: {e}")
        # Process extracted skills with skill relationships for the fallback
        all_job_skill_names = [skill["name"] for skill in job_skills]

        # Add implied skills to extracted skills
        implied_skills = []
        for skill in extracted_skills:
            if skill in skill_relationships:
                for related_skill in skill_relationships[skill]:
                    if related_skill not in extracted_skills and related_skill not in implied_skills:
                        implied_skills.append(related_skill)

        # Combine extracted and implied skills
        all_extracted_skills = extracted_skills + implied_skills

        # Intelligent skill matching with equivalencies
        matched_skills = []
        missing_skills = []

        for job_skill in all_job_skill_names:
            is_matched = False

            # Direct match
            if job_skill in all_extracted_skills:
                matched_skills.append(job_skill)
                is_matched = True
            else:
                # Check for equivalencies and variations
                job_skill_lower = job_skill.lower()
                for extracted_skill in all_extracted_skills:
                    extracted_skill_lower = extracted_skill.lower()

                    # Check if they're the same skill with different formatting
                    if (job_skill_lower == extracted_skill_lower or
                        job_skill_lower.replace('.', '').replace(' ', '') == extracted_skill_lower.replace('.', '').replace(' ', '') or
                        job_skill_lower in extracted_skill_lower or
                        extracted_skill_lower in job_skill_lower):
                        matched_skills.append(job_skill)
                        is_matched = True
                        break

                # Check skill equivalencies
                if not is_matched:
                    for equiv_skill, components in skill_equivalencies.items():
                        if job_skill in components:
                            # Check if the equivalent skill or any component is in extracted skills
                            if (equiv_skill in all_extracted_skills or
                                any(comp in all_extracted_skills for comp in components)):
                                matched_skills.append(job_skill)
                                is_matched = True
                                break

            if not is_matched:
                missing_skills.append(job_skill)

        # Calculate a basic match score based on the proportion of matched skills
        match_percentage = 0
        if job_skills:
            match_percentage = min(int((len(matched_skills) / len(job_skills)) * 100), 95)

        # Ensure a minimum score if we found any skills
        if matched_skills:
            match_percentage = max(match_percentage, 30)

        # Return a default structure in case of error
        return {
            "extracted_skills": all_extracted_skills,
            "skill_matches": [],
            "match_score": match_percentage,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "suggestions": [
                f"Error analyzing resume: {str(e)}",
                "Please explicitly list your skills in a dedicated skills section.",
                f"Your knowledge of {', '.join(extracted_skills)} implies familiarity with {', '.join(implied_skills)}."
            ]
        }

def process_resume_for_job_application(resume_base64, job_skills, job_description):
    """
    Process a resume for job application.

    Args:
        resume_base64: Base64 encoded resume PDF
        job_skills: List of skills required for the job with importance weights
        job_description: Full job description

    Returns:
        Dictionary with match score and analysis details
    """
    try:
        # Remove data:application/pdf;base64, prefix if present
        if 'base64,' in resume_base64:
            resume_base64 = resume_base64.split('base64,')[1]

        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(base64.b64decode(resume_base64))
            temp_file_path = temp_file.name

        # Extract text from PDF
        resume_text = extract_text_from_pdf(temp_file_path)

        # Clean up temp file
        os.unlink(temp_file_path)

        if not resume_text:
            return {
                "error": "Could not extract text from the PDF",
                "match_score": 0,
                "matched_skills": [],
                "missing_skills": []
            }

        # Log the extracted text for debugging
        print(f"Extracted text from resume (first 500 chars): {resume_text[:500]}")

        # Analyze resume against job requirements
        analysis_result = analyze_resume_for_job_match(resume_text, job_skills, job_description)

        # Log the analysis result for debugging
        print(f"Match score: {analysis_result.get('match_score', 0)}")
        print(f"Matched skills: {analysis_result.get('matched_skills', [])}")

        return analysis_result

    except Exception as e:
        print(f"Error processing resume: {e}")
        return {
            "error": f"Error processing resume: {str(e)}",
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": []
        }

# Test function to verify resume analysis
def test_resume_analysis(resume_text, job_skills, job_description):
    """
    Test function to verify resume analysis without needing to upload a PDF.

    Args:
        resume_text: Plain text of the resume
        job_skills: List of skills required for the job
        job_description: Job description text

    Returns:
        Analysis result
    """
    print("\n===== TESTING RESUME ANALYSIS =====\n")
    print(f"Resume text sample: {resume_text[:200]}...")
    print(f"Job skills: {job_skills}")
    print(f"Job description sample: {job_description[:100]}...")

    # Run the analysis
    result = analyze_resume_for_job_match(resume_text, job_skills, job_description)

    # Print results
    print("\n===== ANALYSIS RESULTS =====\n")
    print(f"Match score: {result.get('match_score', 0)}%")
    print(f"Matched skills: {result.get('matched_skills', [])}")
    print(f"Missing skills: {result.get('missing_skills', [])}")
    print(f"Suggestions: {result.get('suggestions', [])}")

    return result
