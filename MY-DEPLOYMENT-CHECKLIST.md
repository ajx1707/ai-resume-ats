# ✅ MY DEPLOYMENT CHECKLIST

Follow this exact order. Check off each step as you complete it!

## 🔧 PREPARATION (5 minutes)
- [ ] ✅ Code is working locally
- [ ] ✅ MongoDB Atlas is connected
- [ ] ✅ Enhanced AI analysis is working
- [ ] 📁 All files are saved

## 📤 STEP 1: GITHUB (10 minutes)
- [ ] Open Command Prompt/Terminal
- [ ] Navigate to project folder: `cd D:\codes\project-bolt-sb1-cql9xnlv\project`
- [ ] Run: `git init`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Ready for deployment"`
- [ ] Create GitHub repository named `ai-resume-ats`
- [ ] Run: `git remote add origin https://github.com/YOUR_USERNAME/ai-resume-ats.git`
- [ ] Run: `git branch -M main`
- [ ] Run: `git push -u origin main`
- [ ] ✅ Code is on GitHub

## 🐍 STEP 2: BACKEND - RENDER (15 minutes)
- [ ] Go to [render.com](https://render.com)
- [ ] Sign up with GitHub
- [ ] Click "New +" → "Web Service"
- [ ] Connect your `ai-resume-ats` repository
- [ ] Set Name: `ai-resume-ats-backend`
- [ ] Set Environment: `Python 3`
- [ ] Set Build Command: `pip install -r server/requirements.txt`
- [ ] Set Start Command: `cd server && gunicorn --bind 0.0.0.0:$PORT app:app`
- [ ] Add Environment Variables:
  - `JWT_SECRET_KEY = your_super_secret_key_change_this`
  - `MONGO_URI = mongodb+srv://demonke1717:jjkgojojogo17@cluster0.mojnj.mongodb.net/job_portal?retryWrites=true&w=majority&appName=Cluster0`
  - `GROQ_API_KEY = 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`
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] ✅ Copy your backend URL: `https://ai-resume-ats-backend-xxxx.onrender.com`

## 🔄 STEP 3: UPDATE FRONTEND (5 minutes)
- [ ] Double-click `update-api-url.bat` file
- [ ] Enter your Render backend URL when prompted
- [ ] Run: `npm run build`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Update API URL for production"`
- [ ] Run: `git push`
- [ ] ✅ Frontend updated with production API URL

## 🌐 STEP 4: FRONTEND - NETLIFY (10 minutes)
- [ ] Go to [netlify.com](https://netlify.com)
- [ ] Sign up with GitHub
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Choose "Deploy with GitHub"
- [ ] Select your `ai-resume-ats` repository
- [ ] Set Build command: `npm run build`
- [ ] Set Publish directory: `.next`
- [ ] Click "Deploy site"
- [ ] Wait for deployment (2-3 minutes)
- [ ] ✅ Copy your frontend URL: `https://amazing-name-123456.netlify.app`

## 🧪 STEP 5: TESTING (10 minutes)
- [ ] Visit your Netlify URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Upload a resume
- [ ] Test ATS analysis
- [ ] ✅ Everything works!

## 🎉 SUCCESS!

### 🔗 My Live URLs:
- **Frontend**: ________________________________
- **Backend**: ________________________________

### 📝 Notes:
- Render free tier sleeps after 15 minutes (first request may be slow)
- Both services auto-deploy when you push to GitHub
- Your enhanced AI analysis is now live worldwide!

### 🚀 Next Steps:
- [ ] Add to portfolio
- [ ] Share on LinkedIn
- [ ] Apply for jobs with confidence!
- [ ] Show friends and family

**CONGRATULATIONS! You've deployed a full-stack AI application!** 🎊

---

## 🆘 Troubleshooting

### If backend doesn't start:
- Check Render build logs
- Verify environment variables are set
- Make sure requirements.txt is correct

### If frontend can't connect:
- Check .env.local has correct Render URL
- Verify CORS settings in Flask app
- Check browser console for errors

### If features don't work:
- Test backend URL directly in browser
- Check MongoDB connection
- Verify Groq API key

**You've got this!** 🚀
