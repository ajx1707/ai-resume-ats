# Setting up MongoDB Atlas

MongoDB Atlas is MongoDB's cloud database service that provides a fully managed MongoDB deployment. This guide will help you set up MongoDB Atlas for your job portal application.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" or "Sign Up"
3. Create an account using your email or sign in with Google/GitHub

## Step 2: Create a New Cluster

1. After logging in, you'll be prompted to create your first cluster
2. Choose the **FREE** tier (M0 Sandbox)
3. Select a cloud provider and region (choose the one closest to your users)
4. Give your cluster a name (e.g., "job-portal-cluster")
5. Click "Create Cluster"

**Note:** Cluster creation takes 1-3 minutes.

## Step 3: Create a Database User

1. In the Atlas dashboard, go to **Database Access** (in the left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** as the authentication method
4. Enter a username (e.g., "jobportal-user")
5. Generate a secure password or create your own (save this password!)
6. Under "Database User Privileges", select **"Read and write to any database"**
7. Click **"Add User"**

## Step 4: Configure Network Access

1. Go to **Network Access** (in the left sidebar)
2. Click **"Add IP Address"**
3. For development, you can:
   - Click **"Add Current IP Address"** to add your current IP
   - Or click **"Allow Access from Anywhere"** (0.0.0.0/0) for easier development
4. Click **"Confirm"**

**Security Note:** For production, only whitelist specific IP addresses.

## Step 5: Get Your Connection String

1. Go to **Clusters** (in the left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Python"** as the driver and **"3.6 or later"** as the version
5. Copy the connection string - it will look like:
   ```
   mongodb+srv://username:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Your Application Configuration

1. Replace `<password>` in the connection string with your actual database user password
2. Add the database name to the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/job_portal?retryWrites=true&w=majority
   ```
3. Update your `.env` file:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/job_portal?retryWrites=true&w=majority
   ```

## Step 7: Test the Connection

Run the test script to verify your connection:
```bash
cd server
python test_mongodb.py
```

If successful, you should see:
```
MongoDB connection successful!
Available databases: ['admin', 'local', 'job_portal']
```

## Step 8: Migrate Existing Data (Optional)

If you have existing data in your local MongoDB, you can migrate it using:

1. **Export from local MongoDB:**
   ```bash
   mongodump --db job_portal --out ./backup
   ```

2. **Import to Atlas:**
   ```bash
   mongorestore --uri "mongodb+srv://username:password@cluster.mongodb.net/job_portal" ./backup/job_portal
   ```

## Common Issues and Solutions

### Connection Timeout
- Check your network access settings in Atlas
- Ensure your IP address is whitelisted
- Verify your internet connection

### Authentication Failed
- Double-check your username and password
- Ensure the database user has proper permissions
- Make sure you're using the correct connection string

### Database Not Found
- The database will be created automatically when you first insert data
- Make sure the database name in your connection string matches your application

## Atlas Features You Can Explore

1. **Monitoring**: View real-time metrics and performance
2. **Backup**: Automatic backups with point-in-time recovery
3. **Alerts**: Set up alerts for various database events
4. **Data Explorer**: Browse and edit your data through the web interface
5. **Charts**: Create visualizations of your data

## Security Best Practices

1. Use strong, unique passwords for database users
2. Limit IP address access to only necessary addresses
3. Use connection string environment variables (never hardcode credentials)
4. Regularly rotate database user passwords
5. Monitor database access logs

## Cost Considerations

- **M0 (Free Tier)**: 512 MB storage, shared RAM and vCPU
- **M2/M5**: Dedicated clusters starting at $9/month
- **Data Transfer**: Free within the same region
- **Backup**: Free for M2+ clusters

The free tier is perfect for development and small applications.
