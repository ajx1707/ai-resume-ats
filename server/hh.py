import os
from groq import Groq
import PyPDF2

# Set your Groq API key (replace with your actual key or set as environment variable)
GROQ_API_KEY = "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"  # Replace with your key
# Alternatively: os.environ["GROQ_API_KEY"] = "your-groq-api-key-here"

# Function to extract text from a PDF resume
def extract_text_from_pdf(file_path):
    # Strip any surrounding quotes from the file path
    file_path = file_path.strip('"').strip("'")
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
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found. Please check the path and try again.")
        return None
    except PermissionError:
        print(f"Error: Permission denied to access '{file_path}'. Check file permissions.")
        return None
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

# Function to analyze resume using Groq API with LLaMA 3.3
def analyze_resume_with_groq(resume_text, job_desc):
    client = Groq(api_key=GROQ_API_KEY)
    
    # Prompt to extract skills and analyze
    prompt = (
        f"I have a resume and a job description. Your task is to:\n"
        f"1. Extract technical skills from the resume.\n"
        f"2. Extract required technical skills from the job description.\n"
        f"3. Calculate an ATS score based on skill overlap (percentage of job skills matched by resume skills).\n"
        f"4. Identify matched skills and missing skills.\n"
        f"5. Provide suggestions to improve the resume.\n"
        f"6. Recommend skills to learn based on gaps.\n"
        f"Format the output clearly with sections.\n\n"
        f"Resume: {resume_text[:2000]}\n\nJob Description: {job_desc[:2000]}"
    )
    
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",  # Updated to a known Groq model; check Groq docs for LLaMA 3.3 variant
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error with Groq API: {e}")
        return None

# Main function to run in terminal
def main():
    print("=== Resume Analyzer ===")
    
    # Get resume file path from user
    resume_path = input("Enter the full path to your resume PDF (e.g., C:\\Users\\ajith\\Downloads\\resume.pdf):\n")
    resume_text = extract_text_from_pdf(resume_path)
    
    if not resume_text:
        print("Cannot proceed due to resume extraction failure.")
        return
    
    print("\nResume text extracted successfully!")
    print(f"Preview: {resume_text[:100]}...")  # Show first 100 chars
    
    # Get job description from user input
    job_desc = input("\nPlease paste the job description here:\n")
    
    # Analyze with Groq API
    print("\nAnalyzing with LLaMA 3.3 via Groq API...")
    analysis = analyze_resume_with_groq(resume_text, job_desc)
    
    if analysis:
        # Print results
        print("\n=== Analysis Results ===")
        print(analysis)
    else:
        print("Analysis failed. Please check your API key or network connection.")

if __name__ == "__main__":
    main()