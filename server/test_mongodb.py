from pymongo import MongoClient
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

def test_mongodb_connection():
    # Get MongoDB URI from environment or use default
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/job_portal")

    # Hide password in logs for security
    display_uri = mongo_uri
    if "@" in mongo_uri and "://" in mongo_uri:
        # For Atlas URIs, hide the password
        parts = mongo_uri.split("://")
        if len(parts) == 2:
            protocol = parts[0]
            rest = parts[1]
            if "@" in rest:
                credentials, host_part = rest.split("@", 1)
                if ":" in credentials:
                    username = credentials.split(":")[0]
                    display_uri = f"{protocol}://{username}:***@{host_part}"

    print(f"Attempting to connect to MongoDB at: {display_uri}")

    try:
        # Create MongoDB client with longer timeout for Atlas
        timeout_ms = 10000 if "mongodb+srv" in mongo_uri else 5000
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=timeout_ms)

        # Force a command to test the connection
        client.admin.command('ping')

        # Extract database name from URI
        if "mongodb+srv" in mongo_uri:
            # Atlas URI format
            db_name = "job_portal"  # Default database name
            if "/" in mongo_uri.split("@")[1]:
                db_part = mongo_uri.split("@")[1].split("/")[1].split("?")[0]
                if db_part:
                    db_name = db_part
        else:
            # Local MongoDB URI format
            db_name = mongo_uri.split('/')[-1].split('?')[0]

        db = client[db_name]

        print("✅ MongoDB connection successful!")
        print(f"📊 Connected to database: {db_name}")

        # List available databases
        try:
            databases = client.list_database_names()
            print(f"📁 Available databases: {databases}")
        except Exception as e:
            print(f"⚠️  Could not list databases (this is normal for some Atlas configurations): {e}")

        # Test creating a user
        test_user = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "test_password",
        }

        users = db.users

        # Check if the test user already exists
        existing_user = users.find_one({"email": test_user["email"]})
        if existing_user:
            print(f"👤 Test user already exists with id: {existing_user['_id']}")
        else:
            result = users.insert_one(test_user)
            print(f"✨ Created test user with id: {result.inserted_id}")

        # Count users in the collection
        user_count = users.count_documents({})
        print(f"📈 Total users in database: {user_count}")

        # Test other collections
        collections = ["profiles", "resume_analyses"]
        for collection_name in collections:
            count = db[collection_name].count_documents({})
            print(f"📋 {collection_name}: {count} documents")

        print("\n🎉 All tests passed! Your MongoDB connection is working correctly.")
        return True

    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")

        # Provide helpful error messages
        error_str = str(e).lower()
        if "authentication failed" in error_str:
            print("\n💡 Troubleshooting tips:")
            print("   - Check your username and password in the connection string")
            print("   - Ensure the database user exists in MongoDB Atlas")
            print("   - Verify the user has proper permissions")
        elif "timeout" in error_str or "connection" in error_str:
            print("\n💡 Troubleshooting tips:")
            print("   - Check your internet connection")
            print("   - Verify your IP address is whitelisted in MongoDB Atlas Network Access")
            print("   - Ensure the cluster is running and accessible")
        elif "name resolution" in error_str or "dns" in error_str:
            print("\n💡 Troubleshooting tips:")
            print("   - Check the cluster hostname in your connection string")
            print("   - Verify your internet connection")

        return False

if __name__ == "__main__":
    success = test_mongodb_connection()
    sys.exit(0 if success else 1) 