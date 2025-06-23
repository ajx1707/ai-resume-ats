@echo off
echo 🚀 API URL Updater for Deployment
echo.
echo This script will help you update your API URL after deploying to Render
echo.

set /p RENDER_URL="Enter your Render backend URL (e.g., https://ai-resume-ats-backend-xxxx.onrender.com): "

echo.
echo Updating .env.local file...
echo NEXT_PUBLIC_API_URL=%RENDER_URL% > .env.local

echo.
echo ✅ Updated .env.local with your Render URL!
echo.
echo Next steps:
echo 1. Run: npm run build
echo 2. Commit changes: git add . && git commit -m "Update API URL" && git push
echo 3. Deploy to Netlify
echo.
pause
