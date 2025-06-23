# Setting up MongoDB Locally

## Step 1: Install MongoDB Community Edition

### For Windows:
1. Download the MongoDB Community Server from the [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the installation wizard
3. Choose "Complete" setup type
4. Install MongoDB Compass (the GUI tool) when prompted
5. Complete the installation

### For macOS:
Using Homebrew:
```bash
brew tap mongodb/brew
brew install mongodb-community
```

### For Linux (Ubuntu):
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

## Step 2: Start MongoDB Service

### For Windows:
1. MongoDB should be installed as a service and start automatically
2. To verify, open Task Manager and check if `mongod.exe` is running
3. If not, start MongoDB service from Services (Win + R, then type `services.msc`)

### For macOS:
```bash
brew services start mongodb-community
```

### For Linux (Ubuntu):
```bash
sudo systemctl start mongod
```

## Step 3: Verify MongoDB is Running

Open a terminal/command prompt and run:
```bash
mongosh
```

You should see the MongoDB shell connecting to localhost:27017.

## Step 4: Create the Database

In the MongoDB shell, create the job portal database:
```
use job_portal
```

## Step 5: Testing with Flask Application

Now run the Flask application:
```bash
python app.py
```

The application should connect to your local MongoDB instance at `mongodb://localhost:27017/job_portal`

## Common Issues:

1. **MongoDB not starting**: Check if the MongoDB data directory exists and has proper permissions.
2. **Connection refused**: Make sure MongoDB is running and listening on port 27017.
3. **Authentication failure**: If you've set up MongoDB with authentication, update the connection string in `.env`. 