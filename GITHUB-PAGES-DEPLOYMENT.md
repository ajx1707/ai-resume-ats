# 🚀 GitHub Pages Deployment Guide

Deploy your AI Resume ATS frontend using **100% FREE** GitHub Pages + GitHub Actions!

## ✅ **Why GitHub Pages?**

- ✅ **Completely FREE** - No credit card required
- ✅ **No external accounts** needed (you already have GitHub)
- ✅ **Automatic deployment** with GitHub Actions
- ✅ **Custom domain support** (optional)
- ✅ **SSL certificate** included
- ✅ **Fast CDN** worldwide

---

## 🔧 **STEP 1: Enable GitHub Pages**

1. Go to your GitHub repository: `https://github.com/ajx1707/ai-resume-ats`
2. Click **"Settings"** tab
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Source"**, select **"GitHub Actions"**
5. Click **"Save"**

---

## 🔑 **STEP 2: Add Backend URL Secret**

1. In your GitHub repository, go to **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. Click **"New repository secret"**
3. Add this secret:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://YOUR-BACKEND-URL-HERE
   ```
   (You'll update this after deploying your backend)

---

## 📤 **STEP 3: Push and Deploy**

```bash
# Commit the GitHub Actions workflow
git add .
git commit -m "Add GitHub Pages deployment workflow"
git push
```

**That's it!** GitHub Actions will automatically:
1. Build your Next.js app
2. Export it as static files
3. Deploy to GitHub Pages

---

## 🌐 **Your Live URLs**

After deployment (2-3 minutes), your app will be available at:

**Frontend**: `https://ajx1707.github.io/ai-resume-ats/`

---

## 🐍 **STEP 4: Deploy Backend**

Now you need to deploy your backend. Here are the **FREE** options:

### **Option 1: Railway** (Recommended - No Card)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Deploy from GitHub repo
4. Add environment variables
5. Get your backend URL

### **Option 2: Render** (If you can get past card requirement)
1. Go to [render.com](https://render.com)
2. Deploy Python web service
3. Add environment variables

### **Option 3: PythonAnywhere** (Free Python hosting)
1. Go to [pythonanywhere.com](https://pythonanywhere.com)
2. Free tier available
3. Upload your Flask app

---

## 🔄 **STEP 5: Update Backend URL**

After deploying your backend:

1. Go to GitHub repository **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. Edit the **"NEXT_PUBLIC_API_URL"** secret
3. Update with your actual backend URL
4. Push any change to trigger redeployment:
   ```bash
   git commit --allow-empty -m "Trigger redeploy with backend URL"
   git push
   ```

---

## 🧪 **Testing Your Deployment**

1. Visit: `https://ajx1707.github.io/ai-resume-ats/`
2. Test user registration/login
3. Upload resume and test ATS analysis
4. Check all features work

---

## 🎯 **Advantages of This Setup**

✅ **100% Free** - No costs ever  
✅ **No external accounts** - Just GitHub  
✅ **Automatic deployment** - Push to deploy  
✅ **Professional URLs** - Great for portfolio  
✅ **SSL included** - Secure by default  
✅ **Global CDN** - Fast worldwide  

---

## 🔧 **Troubleshooting**

### If build fails:
- Check **"Actions"** tab in GitHub for error logs
- Make sure all dependencies are in package.json
- Verify Next.js config is correct

### If pages don't load:
- Check GitHub Pages settings
- Verify the site URL is correct
- Wait a few minutes for DNS propagation

### If API calls fail:
- Check the backend URL secret is set correctly
- Verify backend is deployed and working
- Check browser console for CORS errors

---

## 🎉 **You're Done!**

Your AI Resume ATS frontend is now deployed on GitHub Pages!

**Frontend**: `https://ajx1707.github.io/ai-resume-ats/`  
**Backend**: Deploy next using Railway/Render/PythonAnywhere

### 🚀 **Next Steps:**
1. Deploy your backend (I recommend Railway)
2. Update the backend URL secret
3. Test everything works
4. Share your live app!

**Congratulations! You're using professional deployment practices!** 🎊
