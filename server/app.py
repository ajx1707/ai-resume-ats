from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient
from dotenv import load_dotenv
import bcrypt
import os
import datetime
from bson import ObjectId
import base64
from groq import Groq
import PyPDF2
import tempfile

# Import resume analyzer
from resume_analyzer import process_resume_for_job_application, test_resume_analysis

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
# Configure CORS for deployment
CORS(app, origins=["http://localhost:3000", "https://*.netlify.app", "https://*.vercel.app"],
     supports_credentials=True)

# Configure JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# Connect to MongoDB
mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://demonke1717:jjkgojojogo17@cluster0.mojnj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(mongo_uri)
db = client["job_portal"]  # Access the job_portal database directly
users_collection = db.users
profiles_collection = db.profiles

# Helper functions
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def check_password(password, hashed_password):
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password)

# Helper to convert ObjectId to string for JSON serialization
def serialize_object_id(obj_id):
    if isinstance(obj_id, ObjectId):
        return str(obj_id)
    return obj_id

# Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json

    # Check if user already exists
    if users_collection.find_one({"email": data['email']}):
        return jsonify({"message": "Email already registered"}), 400

    # Create new user with user_type
    new_user = {
        "name": data['name'],
        "email": data['email'],
        "password": hash_password(data['password']),
        "user_type": data.get('user_type', 'applicant'),  # Default to applicant if not specified
        "created_at": datetime.datetime.now()
    }

    result = users_collection.insert_one(new_user)
    user_id = result.inserted_id

    # Create empty profile
    default_profile = {
        "user_id": user_id,
        "title": "",
        "location": "",
        "about": "",
        "photo": "",
        "resume": "",  # Add empty resume field
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
        "social_links": {
            "linkedin": "",
            "github": "",
            "website": ""
        },
        "created_at": datetime.datetime.now(),
        "updated_at": datetime.datetime.now()
    }

    profiles_collection.insert_one(default_profile)

    return jsonify({
        "message": "User registered successfully",
        "user_type": new_user["user_type"]
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json

    # Find user
    user = users_collection.find_one({"email": data['email']})

    if not user or not check_password(data['password'], user['password']):
        return jsonify({"message": "Invalid email or password"}), 401

    # Generate access token
    access_token = create_access_token(identity=str(user['_id']))

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user['_id']),
            "name": user['name'],
            "email": user['email'],
            "user_type": user.get('user_type', 'applicant')  # Include user_type in response
        }
    }), 200

@app.route('/api/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        user = users_collection.find_one({"_id": user_obj_id})

        if not user:
            return jsonify({"message": "User not found"}), 404

        return jsonify({
            "user": {
                "id": user_id,
                "name": user['name'],
                "email": user['email']
            }
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving user: {str(e)}"}), 500

# Profile routes
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        profile = profiles_collection.find_one({"user_id": user_obj_id})

        if not profile:
            return jsonify({"message": "Profile not found"}), 404

        # Convert ObjectId to string for serialization
        profile['_id'] = serialize_object_id(profile['_id'])
        profile['user_id'] = serialize_object_id(profile['user_id'])

        return jsonify({
            "profile": profile
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving profile: {str(e)}"}), 500

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        # Update profile
        data['user_id'] = user_obj_id
        data['updated_at'] = datetime.datetime.now()

        # Validate data fields
        allowed_fields = [
            "user_id", "title", "location", "about", "skills",
            "experience", "education", "certifications", "social_links",
            "photo", "updated_at"
        ]

        # Filter out unwanted fields
        filtered_data = {k: v for k, v in data.items() if k in allowed_fields}

        result = profiles_collection.update_one(
            {"user_id": user_obj_id},
            {"$set": filtered_data},
            upsert=True
        )

        if result.modified_count > 0 or result.upserted_id:
            return jsonify({"message": "Profile updated successfully"}), 200
        else:
            return jsonify({"message": "No changes made to profile"}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating profile: {str(e)}"}), 500

# Add photo upload endpoint
@app.route('/api/profile/photo', methods=['POST'])
@jwt_required()
def upload_profile_photo():
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        # Check if the photo data is provided
        if not data or 'photo' not in data:
            return jsonify({"message": "No photo data provided"}), 400

        # Update profile with the new photo
        result = profiles_collection.update_one(
            {"user_id": user_obj_id},
            {"$set": {
                "photo": data['photo'],
                "updated_at": datetime.datetime.now()
            }}
        )

        if result.modified_count > 0:
            return jsonify({"message": "Profile photo updated successfully"}), 200
        else:
            return jsonify({"message": "No changes made to profile photo"}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating profile photo: {str(e)}"}), 500

# Debug endpoint to check profile structure
@app.route('/api/debug/profile', methods=['GET'])
@jwt_required()
def debug_profile():
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        profile = profiles_collection.find_one({"user_id": user_obj_id})

        if not profile:
            return jsonify({"message": "Profile not found"}), 404

        # Convert ObjectId to string for serialization
        profile['_id'] = serialize_object_id(profile['_id'])
        profile['user_id'] = serialize_object_id(profile['user_id'])

        # Show all fields in the profile
        return jsonify({
            "profile_structure": {
                "fields": list(profile.keys()),
                "has_photo_field": "photo" in profile,
                "photo_length": len(str(profile.get('photo', '')))
            },
            "profile": profile
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving profile: {str(e)}"}), 500

# Migration endpoint to update profile schema
@app.route('/api/admin/migrate-profiles', methods=['GET'])
def migrate_profiles():
    try:
        # Find all profiles
        profiles = profiles_collection.find({})

        updated_count = 0
        total_count = 0

        # Ensure all profiles have the photo field
        for profile in profiles:
            total_count += 1
            update_fields = {}

            # Check if photo field is missing
            if 'photo' not in profile:
                update_fields['photo'] = ''

            # Update the profile if needed
            if update_fields:
                profiles_collection.update_one(
                    {'_id': profile['_id']},
                    {'$set': update_fields}
                )
                updated_count += 1

        return jsonify({
            "message": f"Migration completed. {updated_count} of {total_count} profiles updated."
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during migration: {str(e)}"}), 500

# Migration endpoint to update user schema with user_type
@app.route('/api/admin/migrate-users', methods=['GET'])
def migrate_users():
    try:
        # Find all users
        users = users_collection.find({})

        updated_count = 0
        total_count = 0

        # Ensure all users have a user_type field
        for user in users:
            total_count += 1
            update_fields = {}

            # Check if user_type field is missing
            if 'user_type' not in user:
                update_fields['user_type'] = 'applicant'  # Default to applicant

            # Update the user if needed
            if update_fields:
                users_collection.update_one(
                    {'_id': user['_id']},
                    {'$set': update_fields}
                )
                updated_count += 1

        return jsonify({
            "message": f"User migration completed. {updated_count} of {total_count} users updated with user_type."
        }), 200
    except Exception as e:
        return jsonify({"message": f"Error during user migration: {str(e)}"}), 500

# Resume analysis endpoint
@app.route('/api/resume-analyze', methods=['POST'])
@jwt_required()
def analyze_resume():
    user_id = get_jwt_identity()

    try:
        # Get data from request
        data = request.json

        # Check for required fields
        if not data or 'resume_pdf' not in data or 'job_description' not in data:
            return jsonify({"message": "Resume PDF and job description are required"}), 400

        resume_pdf_base64 = data['resume_pdf']
        job_description = data['job_description']

        # Remove data:application/pdf;base64, prefix if present
        if 'base64,' in resume_pdf_base64:
            resume_pdf_base64 = resume_pdf_base64.split('base64,')[1]

        # Create a temporary file to store the PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(base64.b64decode(resume_pdf_base64))
            temp_file_path = temp_file.name

        analysis_result_data = None # Initialize
        try:
            # Extract text from PDF
            resume_text = extract_text_from_pdf(temp_file_path)

            if not resume_text:
                os.unlink(temp_file_path)  # Clean up temp file
                return jsonify({"message": "Could not extract text from the PDF"}), 400

            # Analyze resume - get structured data
            analysis_result_data = analyze_resume_with_groq(resume_text, job_description)

            if not analysis_result_data or not analysis_result_data.get("full_text"):
                os.unlink(temp_file_path)  # Clean up temp file
                # Check if there was an error message in the structure
                error_msg = analysis_result_data.get("full_text", "Analysis failed") if analysis_result_data else "Analysis failed"
                return jsonify({"message": error_msg}), 500

            # Store analysis in database
            user_obj_id = ObjectId(user_id)

            analysis_record = {
                "user_id": user_obj_id,
                "resume_text": resume_text, # Maybe store only parts if too large?
                "job_description": job_description,
                # Store the structured data
                "analysis_results": analysis_result_data,
                "created_at": datetime.datetime.now()
            }

            # Store in a new collection for resume analyses
            db.resume_analyses.insert_one(analysis_record)

            # Clean up temp file
            os.unlink(temp_file_path)

            # Return the structured analysis data to the frontend
            return jsonify({
                "message": "Resume analysis completed successfully",
                "analysis": analysis_result_data # Send the whole structure
            }), 200

        finally:
            # Ensure temp file is deleted even if an exception occurs
            if os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception as unlink_err:
                    print(f"Error removing temp file {temp_file_path}: {unlink_err}")

    except Exception as e:
        # Log the full traceback for debugging
        import traceback
        print(f"Error in /api/resume-analyze endpoint: {traceback.format_exc()}")
        return jsonify({"message": f"Error analyzing resume: {str(e)}"}), 500

# Extract text from PDF
def extract_text_from_pdf(file_path):
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text
            if not text.strip():
                raise ValueError("No text could be extracted from the PDF. It might be a scanned image.")
            return text
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

# Analyze resume using Groq API
def analyze_resume_with_groq(resume_text, job_desc):
    # Set Groq API key
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

    client = Groq(api_key=GROQ_API_KEY)

    # Updated prompt to analyze against the PROVIDED job description
    prompt = (
        f"""Analyze the provided resume against the provided job description.
Follow this EXACT structure for your response:

1. SKILLS ANALYSIS (MOST IMPORTANT SECTION)
   A. Skills Found in Resume:
      - List ALL technical skills, tools, programming languages, frameworks, methodologies, and relevant soft skills found in the resume.
      - Be thorough and extract from all sections (summary, experience, projects, skills list).

   B. Skills Required in Job Description:
      - List ALL technical skills, tools, qualifications, and requirements mentioned in the PROVIDED job description.
      - Include both explicit and implicit requirements based on the job title and description.

   C. Skills Matching Results:
      ---Matched Skills Start---
      - List ONLY the skills that appear in BOTH the resume (Section 1.A) AND the job description (Section 1.B).
      - For each match, specify the match type:
        * Exact Match: Same term appears in both.
        * Equivalent Match: Different terms for same skill (e.g., JS/JavaScript, Git/Version Control).
        * Partial Match: Related but not exact skills (e.g., specific database vs. general SQL requirement).
      ---Matched Skills End---

   D. Missing Skills:
      ---Missing Skills Start---
      - List ONLY the skills required in the job description (Section 1.B) that are NOT found in the resume (Section 1.A).
      - Do NOT list skills that are already matched in Section 1.C.
      - Do NOT list skills that are not mentioned in the job description.
      ---Missing Skills End---

2. ATS SCORE CALCULATION
   ---ATS Score Start---
   - Keyword Matching (40%): [percentage] (Based on the count and quality of matches in Section 1.C compared to Section 1.B).
   - Experience Alignment (30%): [percentage] (Assess alignment of resume experience (years, titles, projects) with job description requirements).
   - Education/Qualifications Alignment (20%): [percentage] (Assess alignment of resume education/certifications with job description requirements).
   - Format & Relevance (10%): [percentage] (Assess overall resume structure, clarity, and relevance to the specific job description).
   - TOTAL ATS SCORE: [percentage]
   ---ATS Score End---

3. EXPERIENCE ANALYSIS
   - Assess alignment of candidate's experience (years, roles, responsibilities) with the requirements stated in the job description.
   - Note relevant projects or achievements.
   - Identify any major gaps compared to the job description.

4. EDUCATION & CERTIFICATIONS ANALYSIS
   - Assess alignment of candidate's education and certifications with requirements stated in the job description.

5. RESUME STRUCTURE & CLARITY
   - Briefly comment on the resume's organization, formatting, and ease of reading in the context of the job description.

6. IMPROVEMENT SUGGESTIONS
   - Provide specific, actionable suggestions for the candidate to improve their resume *specifically for the provided job description*.
   - Focus on addressing missing skills (from Section 1.D) or better highlighting relevant experience/matches (from Section 1.C).

CRITICAL INSTRUCTIONS:
1. Base the entire analysis (Skills Required, Matching, Missing, ATS Score, Suggestions) on the *specific job description provided by the user*, not a generic profile.
2. Use the exact delimiters: `---Matched Skills Start---`, `---Matched Skills End---`, `---Missing Skills Start---`, `---Missing Skills End---`, `---ATS Score Start---`, `---ATS Score End---`.
3. Ensure skills listed under the delimiters are ONLY skill names and their match types (for matched). Do NOT include other analysis text within these delimited blocks.
4. Keep each numbered section separate and follow the specified structure precisely.
5. Be objective and base the analysis on the text provided in the resume and job description.

Resume: {resume_text[:4000]}

Job Description: {job_desc[:2000]}
"""
    )

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.1
        )

        full_analysis_text = response.choices[0].message.content

        # Parse the response to extract specific sections
        matched_skills = parse_section(full_analysis_text, "---Matched Skills Start---", "---Matched Skills End---")
        missing_skills = parse_section(full_analysis_text, "---Missing Skills Start---", "---Missing Skills End---")
        ats_score_details = parse_section(full_analysis_text, "---ATS Score Start---", "---ATS Score End---")

        # Return structured data including parsed lists and full text
        return {
            "full_text": full_analysis_text,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "ats_score_details": ats_score_details
        }

    except Exception as e:
        print(f"Error with Groq API or parsing: {e}")
        # Return structure with error indication
        return {
            "full_text": f"Error generating or parsing analysis: {e}",
            "matched_skills": [],
            "missing_skills": [],
            "ats_score_details": []
        }

# Helper function to parse sections based on delimiters
def parse_section(text, start_delimiter, end_delimiter):
    try:
        start_index = text.find(start_delimiter) # Use find instead of index to avoid exception
        if start_index == -1:
            print(f"Warning: Start delimiter '{start_delimiter}' not found.")
            return []
        start_index += len(start_delimiter)

        end_index = text.find(end_delimiter, start_index)
        if end_index == -1:
            print(f"Warning: End delimiter '{end_delimiter}' not found after start delimiter.")
             # Try to read until the next section number or end of text as fallback?
             # For now, return empty if end delimiter is missing
            return []

        section_text = text[start_index:end_index].strip()
        # Split into lines and remove empty lines or bullet points/whitespace
        # Use text.splitlines() for better handling of different newline chars
        lines = [line.strip().lstrip('-* ') for line in section_text.splitlines() if line.strip()]
        # Filter out potential subsection headers accidentally included
        lines = [line for line in lines if not line.endswith(':')]
        return lines
    except Exception as e:
        print(f"Error parsing section between '{start_delimiter}' and '{end_delimiter}': {e}")
        return []

# Job routes
@app.route('/api/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    user_id = get_jwt_identity()
    user_type = request.args.get('user_type', 'applicant')

    try:
        user_obj_id = ObjectId(user_id)
        query = {}

        # If user is recruiter, only show their posted jobs
        if user_type == 'recruiter':
            query = {"posted_by": user_obj_id}

        jobs = list(db.jobs.find(query))
        for job in jobs:
            job['_id'] = serialize_object_id(job['_id'])
            job['posted_by'] = serialize_object_id(job['posted_by'])
        return jsonify({"jobs": jobs}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving jobs: {str(e)}"}), 500

@app.route('/api/jobs', methods=['POST'])
@jwt_required()
def create_job():
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        # Validate skill importance levels
        skills = []
        for skill in data['skills']:
            if not isinstance(skill, dict) or 'name' not in skill or 'importance' not in skill:
                return jsonify({"message": "Invalid skill format. Each skill must have 'name' and 'importance' fields"}), 400
            if not 0 <= skill['importance'] <= 100:
                return jsonify({"message": "Skill importance must be between 0 and 100"}), 400
            skills.append({
                "name": skill['name'],
                "importance": skill['importance']
            })

        # Create new job
        new_job = {
            "title": data['title'],
            "company": data['company'],
            "location": data['location'],
            "salary": data['salary'],
            "type": data['type'],
            "experience": data['experience'],
            "description": data['description'],
            "skills": skills,
            "posted_by": user_obj_id,
            "posted_at": datetime.datetime.now(),
            "applicants": [],
            "status": "active"
        }

        result = db.jobs.insert_one(new_job)
        job_id = result.inserted_id

        return jsonify({
            "message": "Job posted successfully",
            "job_id": str(job_id)
        }), 201
    except Exception as e:
        return jsonify({"message": f"Error creating job: {str(e)}"}), 500

@app.route('/api/jobs/<job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)
        job_obj_id = ObjectId(job_id)

        # Check if job exists and user is the owner
        job = db.jobs.find_one({"_id": job_obj_id})
        if not job:
            return jsonify({"message": "Job not found"}), 404

        if job['posted_by'] != user_obj_id:
            return jsonify({"message": "Unauthorized to update this job"}), 403

        # Update job
        update_data = {
            "title": data.get('title', job['title']),
            "company": data.get('company', job['company']),
            "location": data.get('location', job['location']),
            "salary": data.get('salary', job['salary']),
            "type": data.get('type', job['type']),
            "experience": data.get('experience', job['experience']),
            "description": data.get('description', job['description']),
            "skills": data.get('skills', job['skills']),
            "status": data.get('status', job['status'])
        }

        db.jobs.update_one(
            {"_id": job_obj_id},
            {"$set": update_data}
        )

        return jsonify({"message": "Job updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error updating job: {str(e)}"}), 500

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        job_obj_id = ObjectId(job_id)

        # Check if job exists and user is the owner
        job = db.jobs.find_one({"_id": job_obj_id})
        if not job:
            return jsonify({"message": "Job not found"}), 404

        if job['posted_by'] != user_obj_id:
            return jsonify({"message": "Unauthorized to delete this job"}), 403

        # Delete job
        db.jobs.delete_one({"_id": job_obj_id})

        return jsonify({"message": "Job deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting job: {str(e)}"}), 500

@app.route('/api/jobs/<job_id>/apply', methods=['POST'])
@jwt_required()
def apply_for_job(job_id):
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)
        job_obj_id = ObjectId(job_id)

        # Check if job exists
        job = db.jobs.find_one({"_id": job_obj_id})
        if not job:
            return jsonify({"message": "Job not found"}), 404

        # Check if user has already applied
        existing_application = False
        for applicant in job.get('applicants', []):
            if isinstance(applicant, dict) and applicant.get('user_id') == str(user_obj_id):
                existing_application = True
                break
            elif applicant == user_obj_id:
                existing_application = True
                break

        if existing_application:
            return jsonify({"message": "You have already applied for this job"}), 400

        # Check if resume data is provided
        if not data or not data.get('resume'):
            return jsonify({"message": "Please upload your resume before applying"}), 400

        # Get user profile data
        user = db.users.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"message": "User profile not found"}), 404

        # Prepare application data
        resume_data = data.get('resume')
        file_name = data.get('fileName', 'resume.pdf')

        # Analyze resume against job requirements using Groq API
        print("Analyzing resume against job requirements...")
        analysis_result = process_resume_for_job_application(
            resume_data,
            job.get('skills', []),
            job.get('description', '')
        )

        # Extract match score and skills data
        match_score = analysis_result.get('match_score', 0)
        matched_skills = analysis_result.get('matched_skills', [])
        missing_skills = analysis_result.get('missing_skills', [])
        suggestions = analysis_result.get('suggestions', [])

        # Prepare application data with analysis results
        application = {
            "user_id": str(user_obj_id),
            "applicantName": user.get('name', 'Applicant'),
            "applicantEmail": user.get('email', ''),
            "resume": resume_data,
            "fileName": file_name,
            "applied_at": datetime.datetime.now().isoformat(),
            "status": "pending",
            "matchScore": match_score,
            "matchedSkills": matched_skills,
            "missingSkills": missing_skills,
            "suggestions": suggestions,
            "analysis": analysis_result
        }

        # Add application to job
        db.jobs.update_one(
            {"_id": job_obj_id},
            {"$push": {"applicants": application}}
        )

        # Create notification for RECRUITER about new application
        recruiter_id = job['posted_by']
        create_notification(
            recruiter_id,
            "new_application",
            "New Application",
            f"{user.get('name', 'Someone')} applied for {job['title']}",
            related_id=str(job_obj_id),
            related_type="job"
        )

        # Create notification for APPLICANT about successful application
        create_notification(
            user_obj_id,
            "application_submitted",
            "Application Submitted",
            f"Your application for {job['title']} at {job['company']} has been submitted",
            related_id=str(job_obj_id),
            related_type="job"
        )

        # Create a conversation between applicant and recruiter if it doesn't exist
        try:
            # Check if conversation already exists
            existing_conversation = db.conversations.find_one({
                "participants": {
                    "$all": [
                        {"$elemMatch": {"user_id": str(user_obj_id)}},
                        {"$elemMatch": {"user_id": str(recruiter_id)}}
                    ]
                }
            })

            if not existing_conversation:
                # Create new conversation
                new_conversation = {
                    "participants": [
                        {"user_id": str(user_obj_id)},
                        {"user_id": str(recruiter_id)}
                    ],
                    "created_at": datetime.datetime.now(),
                    "last_message_at": datetime.datetime.now(),
                    "last_message": "",
                    "job_id": str(job_obj_id),  # Reference to the job
                    "job_title": job['title']   # Store job title for easy reference
                }

                conversation_result = db.conversations.insert_one(new_conversation)
                conversation_id = conversation_result.inserted_id

                # Send an automatic first message - one for each participant
                # Message for the applicant (only visible to the applicant)
                applicant_message = {
                    "conversation_id": str(conversation_id),
                    "sender_id": "system",  # Special sender ID for system messages
                    "recipient_id": str(user_obj_id),  # Send to applicant
                    "content": f"You have applied for {job['title']} at {job['company']}. You can now message the recruiter directly.",
                    "created_at": datetime.datetime.now(),
                    "read": False,
                    "read_at": None,
                    "is_system_message": True
                }

                db.messages.insert_one(applicant_message)

                # Update conversation with last message
                db.conversations.update_one(
                    {"_id": conversation_id},
                    {
                        "$set": {
                            "last_message": "Applied for job",
                            "last_message_at": applicant_message["created_at"]
                        }
                    }
                )

                # Message for the recruiter (only visible to the recruiter)
                recruiter_message = {
                    "conversation_id": str(conversation_id),
                    "sender_id": "system",  # Special sender ID for system messages
                    "recipient_id": str(recruiter_id),  # Send to recruiter
                    "content": f"{user.get('name', 'Someone')} has applied for {job['title']}. You can now message them directly.",
                    "created_at": datetime.datetime.now(),
                    "read": False,
                    "read_at": None,
                    "is_system_message": True
                }

                db.messages.insert_one(recruiter_message)
        except Exception as e:
            print(f"Error creating conversation: {str(e)}")
            # Don't fail the application if conversation creation fails

        return jsonify({
            "message": "Application submitted successfully",
            "conversation_created": existing_conversation is None  # Indicate if a new conversation was created
        }), 200
    except Exception as e:
        print(f"Error applying for job: {str(e)}")
        return jsonify({"message": f"Error applying for job: {str(e)}"}), 500

# Resume upload endpoint
@app.route('/api/profile/resume', methods=['POST'])
@jwt_required()
def upload_resume():
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        # Check if the resume data is provided
        if not data or 'resume' not in data:
            return jsonify({"message": "No resume data provided"}), 400

        # Update profile with the new resume
        result = profiles_collection.update_one(
            {"user_id": user_obj_id},
            {"$set": {
                "resume": data['resume'],
                "updated_at": datetime.datetime.now()
            }}
        )

        if result.modified_count > 0:
            return jsonify({"message": "Resume updated successfully"}), 200
        else:
            return jsonify({"message": "No changes made to resume"}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating resume: {str(e)}"}), 500

# Notifications routes
@app.route('/api/notifications', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_notifications():
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"message": "Authentication required"}), 401

    try:
        user_obj_id = ObjectId(user_id)

        # Get user type to determine which notifications to show
        user = users_collection.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"message": "User not found"}), 404

        user_type = user.get('user_type', 'applicant')

        # Query notifications for the user
        notifications = list(db.notifications.find({"user_id": str(user_obj_id)})
                            .sort("created_at", -1)  # Sort by most recent first
                            .limit(50))  # Limit to 50 recent notifications

        for notification in notifications:
            notification['_id'] = serialize_object_id(notification['_id'])

        return jsonify({"notifications": notifications}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving notifications: {str(e)}"}), 500

@app.route('/api/notifications/unread-count', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_notifications_unread_count():
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"message": "Authentication required"}), 401

    try:
        user_obj_id = ObjectId(user_id)

        # Count unread notifications for the user
        unread_count = db.notifications.count_documents({
            "user_id": str(user_obj_id),
            "read": False
        })

        return jsonify({"unread_count": unread_count}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving unread notification count: {str(e)}"}), 500

@app.route('/api/notifications/mark-read', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def mark_notifications_read():
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"message": "Authentication required"}), 401

    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        if data and 'notification_id' in data:
            # Mark single notification as read
            notification_id = ObjectId(data['notification_id'])
            db.notifications.update_one(
                {"_id": notification_id, "user_id": str(user_obj_id)},
                {"$set": {"read": True}}
            )
        else:
            # Mark all notifications as read
            db.notifications.update_many(
                {"user_id": str(user_obj_id), "read": False},
                {"$set": {"read": True}}
            )

        return jsonify({"message": "Notifications marked as read"}), 200
    except Exception as e:
        return jsonify({"message": f"Error marking notifications as read: {str(e)}"}), 500

@app.route('/api/notifications/clear', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def clear_notifications():
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"message": "Authentication required"}), 401

    try:
        user_obj_id = ObjectId(user_id)

        # Delete all notifications for user
        db.notifications.delete_many({"user_id": str(user_obj_id)})

        return jsonify({"message": "Notifications cleared"}), 200
    except Exception as e:
        return jsonify({"message": f"Error clearing notifications: {str(e)}"}), 500

# Helper function to create a notification
def create_notification(user_id, notification_type, title, message, related_id=None, related_type=None, sender_id=None):
    try:
        current_time = datetime.datetime.now()

        # For message notifications, check if there's a recent unread notification from the same sender
        if notification_type == "new_message" and sender_id:
            # Look for existing unread notifications from the same sender in the last hour
            one_hour_ago = current_time - datetime.timedelta(hours=1)
            existing_notification = db.notifications.find_one({
                "user_id": str(user_id),
                "type": notification_type,
                "read": False,
                "sender_id": str(sender_id),
                "created_at": {"$gt": one_hour_ago}
            })

            if existing_notification:
                # Update the existing notification with a count
                message_count = existing_notification.get("message_count", 1) + 1
                content_type = "messages"

                # Check if the message contains an image or file
                if "[Image]" in message or "[File:" in message:
                    content_type = "files"

                # Update the notification with the new count and message
                db.notifications.update_one(
                    {"_id": existing_notification["_id"]},
                    {
                        "$set": {
                            "message": f"{message.split(' sent you ')[0]} sent you {message_count} {content_type}",
                            "message_count": message_count,
                            "updated_at": current_time
                        }
                    }
                )
                return True

        # Create a new notification if no existing one was found or updated
        notification = {
            "user_id": str(user_id),
            "type": notification_type,
            "title": title,
            "message": message,
            "read": False,
            "created_at": current_time,
            "updated_at": current_time,
            "related_id": related_id,
            "related_type": related_type,
            "message_count": 1,
            "sender_id": str(sender_id) if sender_id else None
        }

        db.notifications.insert_one(notification)
        return True
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        return False

# User search endpoint for messaging
@app.route('/api/users/search', methods=['GET'])
@jwt_required()
def search_users():
    user_id = get_jwt_identity()
    search_query = request.args.get('query', '').strip()

    if not search_query:
        return jsonify({"users": []}), 200

    try:
        user_obj_id = ObjectId(user_id)
        current_user = users_collection.find_one({"_id": user_obj_id})

        if not current_user:
            return jsonify({"message": "User not found"}), 404

        # Search for users by name (case-insensitive)
        # Exclude the current user from results
        regex_query = {"name": {"$regex": search_query, "$options": "i"}, "_id": {"$ne": user_obj_id}}
        users = list(users_collection.find(regex_query).limit(10))

        # Format the results
        formatted_users = []
        for user in users:
            # Get user profile for avatar
            profile = profiles_collection.find_one({"user_id": user["_id"]})
            avatar = profile.get('photo', '') if profile else ''

            formatted_users.append({
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "user_type": user.get("user_type", "applicant"),
                "avatar": avatar
            })

        return jsonify({"users": formatted_users}), 200
    except Exception as e:
        return jsonify({"message": f"Error searching users: {str(e)}"}), 500

# Messaging routes
@app.route('/api/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = get_jwt_identity()
    show_archived = request.args.get('archived', 'false').lower() == 'true'

    try:
        user_obj_id = ObjectId(user_id)

        # Base query: find all conversations where the user is a participant
        base_query = {
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}},
            # Exclude conversations deleted by this user
            "deleted_by": {"$ne": str(user_obj_id)}
        }

        # Filter by archived status if requested
        if show_archived:
            # Show only archived conversations
            base_query["archived_by"] = str(user_obj_id)
        else:
            # Show non-archived conversations
            base_query["archived_by"] = {"$ne": str(user_obj_id)}

        # Find conversations matching the query
        conversations = list(db.conversations.find(base_query).sort("last_message_at", -1))

        # Enhance conversations with participant details
        enhanced_conversations = []
        for conv in conversations:
            # Convert ObjectId to string
            conv['_id'] = serialize_object_id(conv['_id'])

            # Get other participant details
            other_participants = []
            for participant in conv['participants']:
                if participant['user_id'] != str(user_obj_id):
                    # Get user details
                    other_user = users_collection.find_one({"_id": ObjectId(participant['user_id'])})
                    if other_user:
                        # Get profile for avatar
                        profile = profiles_collection.find_one({"user_id": ObjectId(participant['user_id'])})
                        avatar = profile.get('photo', '') if profile else ''

                        other_participants.append({
                            "user_id": participant['user_id'],
                            "name": other_user.get('name', 'Unknown User'),
                            "avatar": avatar,
                            "role": other_user.get('user_type', 'applicant').capitalize()
                        })

            # Add other participants to conversation object
            conv['other_participants'] = other_participants

            # Count unread messages for this conversation
            unread_count = db.messages.count_documents({
                "conversation_id": str(conv['_id']),
                "recipient_id": str(user_obj_id),
                "read": False
            })
            conv['unread_count'] = unread_count

            enhanced_conversations.append(conv)

        return jsonify({"conversations": enhanced_conversations}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving conversations: {str(e)}"}), 500

@app.route('/api/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)

        # Validate recipient_id
        if not data or 'recipient_id' not in data:
            return jsonify({"message": "Recipient ID is required"}), 400

        recipient_id = data['recipient_id']

        # Check if recipient exists
        try:
            recipient_obj_id = ObjectId(recipient_id)
            recipient = users_collection.find_one({"_id": recipient_obj_id})
            if not recipient:
                return jsonify({"message": "Recipient not found"}), 404
        except:
            return jsonify({"message": "Invalid recipient ID"}), 400

        # Check if conversation already exists between these users
        existing_conversation = db.conversations.find_one({
            "participants": {
                "$all": [
                    {"$elemMatch": {"user_id": str(user_obj_id)}},
                    {"$elemMatch": {"user_id": str(recipient_obj_id)}}
                ]
            }
        })

        if existing_conversation:
            return jsonify({
                "message": "Conversation already exists",
                "conversation_id": str(existing_conversation['_id'])
            }), 200

        # Create new conversation
        new_conversation = {
            "participants": [
                {"user_id": str(user_obj_id)},
                {"user_id": str(recipient_obj_id)}
            ],
            "created_at": datetime.datetime.now(),
            "last_message_at": datetime.datetime.now(),
            "last_message": ""
        }

        result = db.conversations.insert_one(new_conversation)

        return jsonify({
            "message": "Conversation created successfully",
            "conversation_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"message": f"Error creating conversation: {str(e)}"}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        conversation_obj_id = ObjectId(conversation_id)

        # Check if user is a participant in this conversation
        conversation = db.conversations.find_one({
            "_id": conversation_obj_id,
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}}
        })

        if not conversation:
            return jsonify({"message": "Conversation not found or you're not a participant"}), 404

        # Get user type (applicant or recruiter)
        user = users_collection.find_one({"_id": user_obj_id})
        if not user:
            return jsonify({"message": "User not found"}), 404

        user_type = user.get('user_type', 'applicant')

        # Get messages for this conversation
        # Filter system messages to only show those intended for this user
        messages_query = {
            "$or": [
                # Regular messages
                {"conversation_id": str(conversation_obj_id), "is_system_message": {"$ne": True}},
                # System messages intended for this user
                {"conversation_id": str(conversation_obj_id), "is_system_message": True, "recipient_id": str(user_obj_id)},
                # System messages sent by this user (should be none, but included for completeness)
                {"conversation_id": str(conversation_obj_id), "is_system_message": True, "sender_id": str(user_obj_id)}
            ]
        }

        messages = list(db.messages.find(messages_query).sort("created_at", 1))

        # Convert ObjectId to string
        for message in messages:
            message['_id'] = serialize_object_id(message['_id'])

            # Add a flag to indicate if the current user is the sender
            message['is_sender'] = (message['sender_id'] == str(user_obj_id))

        # Mark unread messages as read
        db.messages.update_many(
            {
                "conversation_id": str(conversation_obj_id),
                "sender_id": {"$ne": str(user_obj_id)},
                "read": False
            },
            {"$set": {"read": True, "read_at": datetime.datetime.now()}}
        )

        return jsonify({"messages": messages, "user_type": user_type}), 200
    except Exception as e:
        return jsonify({"message": f"Error retrieving messages: {str(e)}"}), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    user_id = get_jwt_identity()
    data = request.json

    try:
        user_obj_id = ObjectId(user_id)
        conversation_obj_id = ObjectId(conversation_id)

        # Validate message has either content or file
        has_content = data and 'content' in data and data['content'].strip()
        has_file = data and 'file' in data and data['file']

        if not has_content and not has_file:
            return jsonify({"message": "Message must contain either text content or a file"}), 400

        # Check if user is a participant in this conversation
        conversation = db.conversations.find_one({
            "_id": conversation_obj_id,
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}}
        })

        if not conversation:
            return jsonify({"message": "Conversation not found or you're not a participant"}), 404

        # Get recipient (the other participant)
        recipient_id = None
        for participant in conversation['participants']:
            if participant['user_id'] != str(user_obj_id):
                recipient_id = participant['user_id']
                break

        # Create new message
        current_time = datetime.datetime.now()
        new_message = {
            "conversation_id": str(conversation_obj_id),
            "sender_id": str(user_obj_id),
            "recipient_id": recipient_id,
            "content": data.get('content', ''),
            "created_at": current_time,
            "read": False,
            "read_at": None
        }

        # Add file data if present
        if has_file:
            new_message["file"] = data["file"]

        result = db.messages.insert_one(new_message)

        # Determine last message preview text
        if has_file:
            file_type = data["file"].get("type", "")
            if file_type.startswith("image/"):
                last_message_preview = "[Image]"
            else:
                last_message_preview = f"[File: {data['file'].get('name', 'document')}]"
        else:
            last_message_preview = data['content']

        # Update conversation with last message
        db.conversations.update_one(
            {"_id": conversation_obj_id},
            {
                "$set": {
                    "last_message": last_message_preview,
                    "last_message_at": current_time,
                    "archived_by": []  # Clear archived status when new message is sent
                }
            }
        )

        # Create notification for recipient
        user = users_collection.find_one({"_id": user_obj_id})
        sender_name = user.get('name', 'Someone') if user else 'Someone'

        # Determine message content type for notification
        message_content = "a message"
        if has_file:
            file_type = data["file"].get("type", "")
            if file_type.startswith("image/"):
                message_content = "an image"
            else:
                message_content = "a file"

        create_notification(
            ObjectId(recipient_id),
            "new_message",
            "New Message",
            f"{sender_name} sent you {message_content}",
            related_id=str(conversation_obj_id),
            related_type="conversation",
            sender_id=user_obj_id  # Pass the sender_id for grouping
        )

        # Return the created message with additional fields
        message_response = {
            "_id": str(result.inserted_id),
            "conversation_id": str(conversation_obj_id),
            "sender_id": str(user_obj_id),
            "recipient_id": recipient_id,
            "content": data.get('content', ''),
            "created_at": current_time.isoformat(),
            "read": False,
            "read_at": None,
            "is_sender": True
        }

        # Add file data to response if present
        if has_file:
            message_response["file"] = data["file"]

        return jsonify({
            "message": "Message sent successfully",
            "message_data": message_response
        }), 201
    except Exception as e:
        return jsonify({"message": f"Error sending message: {str(e)}"}), 500

@app.route('/api/conversations/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)

        # Count unread messages where user is the recipient
        unread_count = db.messages.count_documents({
            "recipient_id": str(user_obj_id),
            "read": False
        })

        return jsonify({"unread_count": unread_count}), 200
    except Exception as e:
        return jsonify({"message": f"Error getting unread count: {str(e)}"}), 500

@app.route('/api/conversations/<conversation_id>/archive', methods=['POST'])
@jwt_required()
def archive_conversation(conversation_id):
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        conversation_obj_id = ObjectId(conversation_id)

        # Check if user is a participant in this conversation
        conversation = db.conversations.find_one({
            "_id": conversation_obj_id,
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}}
        })

        if not conversation:
            return jsonify({"message": "Conversation not found or you're not a participant"}), 404

        # Add user to archived_by array if not already there
        db.conversations.update_one(
            {"_id": conversation_obj_id},
            {"$addToSet": {"archived_by": str(user_obj_id)}}
        )

        return jsonify({"message": "Conversation archived successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error archiving conversation: {str(e)}"}), 500

@app.route('/api/conversations/<conversation_id>/unarchive', methods=['POST'])
@jwt_required()
def unarchive_conversation(conversation_id):
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        conversation_obj_id = ObjectId(conversation_id)

        # Check if user is a participant in this conversation
        conversation = db.conversations.find_one({
            "_id": conversation_obj_id,
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}}
        })

        if not conversation:
            return jsonify({"message": "Conversation not found or you're not a participant"}), 404

        # Remove user from archived_by array
        db.conversations.update_one(
            {"_id": conversation_obj_id},
            {"$pull": {"archived_by": str(user_obj_id)}}
        )

        return jsonify({"message": "Conversation unarchived successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error unarchiving conversation: {str(e)}"}), 500

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conversation_id):
    user_id = get_jwt_identity()

    try:
        user_obj_id = ObjectId(user_id)
        conversation_obj_id = ObjectId(conversation_id)

        # Check if user is a participant in this conversation
        conversation = db.conversations.find_one({
            "_id": conversation_obj_id,
            "participants": {"$elemMatch": {"user_id": str(user_obj_id)}}
        })

        if not conversation:
            return jsonify({"message": "Conversation not found or you're not a participant"}), 404

        # Instead of actually deleting, add user to deleted_by array
        # This way the conversation is still available for the other participant
        db.conversations.update_one(
            {"_id": conversation_obj_id},
            {"$addToSet": {"deleted_by": str(user_obj_id)}}
        )

        # Mark all messages as read for this user
        db.messages.update_many(
            {
                "conversation_id": str(conversation_obj_id),
                "recipient_id": str(user_obj_id),
                "read": False
            },
            {"$set": {"read": True, "read_at": datetime.datetime.now()}}
        )

        return jsonify({"message": "Conversation deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": f"Error deleting conversation: {str(e)}"}), 500

# Add notification creation to application status updates
@app.route('/api/applications/<application_id>/status', methods=['PUT'])
@jwt_required()
def update_application_status(application_id):
    user_id = get_jwt_identity()
    data = request.json

    if not data or 'status' not in data:
        return jsonify({"message": "Status is required"}), 400

    new_status = data['status']
    if new_status not in ['pending', 'reviewed', 'shortlisted', 'rejected']:
        return jsonify({"message": "Invalid status"}), 400

    try:
        user_obj_id = ObjectId(user_id)

        # Find the job with this application
        # We need to include the job_id in the query to ensure we're only looking at the specific job
        # This is the key change - we need to find the specific job that contains this application
        job_id = None
        if 'job_id' in data:
            job_id = data['job_id']
            print(f"Job ID provided in request: {job_id}")
            try:
                job_obj_id = ObjectId(job_id)
                job = db.jobs.find_one({"_id": job_obj_id, "applicants.user_id": application_id})
            except Exception as e:
                print(f"Error converting job_id to ObjectId: {str(e)}")
                job = None
        else:
            # If no job_id provided, try to find by application_id only
            # This is the original behavior
            print(f"No job_id provided, searching by application_id only: {application_id}")
            job = db.jobs.find_one({"applicants.user_id": application_id})

        if not job:
            print(f"No job found for application_id: {application_id}")
            return jsonify({"message": "Application not found"}), 404

        print(f"Found job: {job['_id']} with title: {job['title']}")

        # Verify the recruiter is the job poster
        if str(job['posted_by']) != user_id:
            print(f"Unauthorized: job posted_by {job['posted_by']} != user_id {user_id}")
            return jsonify({"message": "Unauthorized to update this application"}), 403

        # Find the application in the job's applicants array
        applicant = None
        for app in job['applicants']:
            if isinstance(app, dict) and app.get('user_id') == application_id:
                applicant = app
                print(f"Found applicant in job: {app}")
                break

        if not applicant:
            print(f"Applicant not found in job's applicants array")
            return jsonify({"message": "Application not found"}), 404

        # Get current status
        current_status = applicant.get('status', 'pending')
        print(f"Current application status: {current_status}")

        # Prevent changing status if application is already in a final state
        # BUT only for THIS specific job application, not all applications from this user
        if current_status in ['shortlisted', 'rejected']:
            print(f"Cannot change status. Application is already in final state: {current_status}")
            return jsonify({
                "message": f"Cannot change status. Application is already {current_status}.",
                "current_status": current_status
            }), 400

        # If the new status is the same as current, just return success
        if current_status == new_status:
            print(f"Application already has status: {current_status}")
            return jsonify({
                "message": f"Application already has status: {current_status}",
                "current_status": current_status
            }), 200

        print(f"Updating application status from {current_status} to {new_status}")
        # Update the application status
        update_result = db.jobs.update_one(
            {"_id": job['_id'], "applicants.user_id": application_id},
            {"$set": {"applicants.$.status": new_status}}
        )

        print(f"Update result: matched={update_result.matched_count}, modified={update_result.modified_count}")

        # Create notification for APPLICANT about status change
        # The application_id is actually the user_id string, not an ObjectId
        try:
            # Try to get the user from the database using the application_id as user_id
            applicant_user = db.users.find_one({"_id": ObjectId(application_id)})
            if applicant_user:
                applicant_obj_id = applicant_user["_id"]
                print(f"Found applicant user: {applicant_user['name']}")
            else:
                # If user not found, just use the application_id as is for notification
                applicant_obj_id = application_id
                print(f"Applicant user not found for ID: {application_id}")
        except Exception as e:
            # If conversion fails, use the application_id as is
            applicant_obj_id = application_id
            print(f"Error finding applicant user: {str(e)}")

        # Different messages based on status
        if new_status == 'reviewed':
            notification_title = "Application Reviewed"
            notification_message = f"Your application for {job['title']} at {job['company']} has been reviewed"
        elif new_status == 'shortlisted':
            notification_title = "Application Shortlisted"
            notification_message = f"Congratulations! You've been shortlisted for {job['title']} at {job['company']}"
        elif new_status == 'rejected':
            notification_title = "Application Status Update"
            notification_message = f"Thank you for your interest in {job['title']} at {job['company']}. We've decided to proceed with other candidates"
        else:
            notification_title = "Application Status Update"
            notification_message = f"Your application for {job['title']} at {job['company']} has been updated"

        notification_result = create_notification(
            applicant_obj_id,
            f"application_{new_status}",
            notification_title,
            notification_message,
            related_id=str(job['_id']),
            related_type="job"
        )
        print(f"Notification created: {notification_result}")

        return jsonify({
            "message": f"Application status updated to {new_status}",
            "previous_status": current_status,
            "current_status": new_status
        }), 200
    except Exception as e:
        print(f"Error updating application status: {str(e)}")
        return jsonify({"message": f"Error updating application status: {str(e)}"}), 500

# Test endpoint for resume analysis
@app.route('/api/test-resume-analysis', methods=['POST'])
@jwt_required()
def test_resume_analysis_endpoint():
    """Test endpoint to verify resume analysis functionality"""
    try:
        data = request.json

        # Check for required fields
        if not data or 'resume_text' not in data or 'job_skills' not in data or 'job_description' not in data:
            return jsonify({
                "message": "Resume text, job skills, and job description are required"
            }), 400

        # Extract data from request
        resume_text = data['resume_text']
        job_skills = data['job_skills']
        job_description = data['job_description']

        # Run the test analysis
        result = test_resume_analysis(resume_text, job_skills, job_description)

        return jsonify({
            "message": "Resume analysis test completed",
            "result": result
        }), 200

    except Exception as e:
        print(f"Error testing resume analysis: {str(e)}")
        return jsonify({
            "message": f"Error testing resume analysis: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Get port from environment variable for deployment
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)