#!/usr/bin/env node

/**
 * Script to help find and update API URLs in your Next.js frontend
 * Run this after deploying your backend to Render
 */

const fs = require('fs');
const path = require('path');

// Your Render backend URL (update this after deployment)
const RENDER_URL = 'https://YOUR-APP-NAME.onrender.com';

// Directories to search for API calls
const searchDirs = ['app', 'components', 'lib', 'hooks', 'pages'];

// Common patterns for API calls
const patterns = [
  /http:\/\/localhost:5000/g,
  /http:\/\/127\.0\.0\.1:5000/g,
  /'http:\/\/localhost:5000'/g,
  /"http:\/\/localhost:5000"/g,
  /`http:\/\/localhost:5000`/g,
];

function findFiles(dir, extension = '.tsx') {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findFiles(fullPath, extension));
    } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.jsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function searchAndReplace() {
  console.log('🔍 Searching for API URLs to update...\n');
  
  let totalFiles = 0;
  let updatedFiles = 0;
  
  for (const dir of searchDirs) {
    const files = findFiles(dir);
    
    for (const file of files) {
      totalFiles++;
      let content = fs.readFileSync(file, 'utf8');
      let hasChanges = false;
      
      // Check each pattern
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          console.log(`📝 Found API URL in: ${file}`);
          content = content.replace(pattern, RENDER_URL);
          hasChanges = true;
        }
      }
      
      // Write back if changes were made
      if (hasChanges) {
        fs.writeFileSync(file, content);
        updatedFiles++;
        console.log(`✅ Updated: ${file}`);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files searched: ${totalFiles}`);
  console.log(`   Files updated: ${updatedFiles}`);
  
  if (updatedFiles > 0) {
    console.log(`\n🎉 API URLs updated successfully!`);
    console.log(`   Old: http://localhost:5000`);
    console.log(`   New: ${RENDER_URL}`);
    console.log(`\n⚠️  Remember to:`);
    console.log(`   1. Test your frontend locally: npm run dev`);
    console.log(`   2. Build and deploy: git add . && git commit -m "Update API URLs" && git push`);
  } else {
    console.log(`\n💡 No API URLs found. You might need to manually check for:`);
    console.log(`   - Different localhost patterns`);
    console.log(`   - Environment variables`);
    console.log(`   - Configuration files`);
  }
}

function showUsage() {
  console.log(`
🚀 API URL Updater for Deployment

Usage:
1. Deploy your backend to Render first
2. Update RENDER_URL in this script with your actual Render URL
3. Run: node update-api-urls.js

Example:
const RENDER_URL = 'https://ai-resume-ats-backend.onrender.com';

Current RENDER_URL: ${RENDER_URL}
`);
}

// Main execution
if (RENDER_URL === 'https://YOUR-APP-NAME.onrender.com') {
  console.log('⚠️  Please update RENDER_URL in this script first!');
  showUsage();
} else {
  searchAndReplace();
}
