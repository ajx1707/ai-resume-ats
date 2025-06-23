#!/usr/bin/env python3
"""
Migration script to transfer data from local MongoDB to MongoDB Atlas.

This script will:
1. Connect to your local MongoDB instance
2. Export all data from the job_portal database
3. Connect to MongoDB Atlas
4. Import the data to Atlas

Usage:
    python migrate_to_atlas.py

Make sure to:
1. Update your .env file with the Atlas connection string
2. Keep your local MongoDB running during migration
3. Backup your data before running this script
"""

from pymongo import MongoClient
from dotenv import load_dotenv
import os
import sys
from datetime import datetime

# Load environment variables
load_dotenv()

def connect_to_local():
    """Connect to local MongoDB instance."""
    local_uri = "mongodb://localhost:27017/job_portal"
    print(f"Connecting to local MongoDB: {local_uri}")
    
    try:
        client = MongoClient(local_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        db = client.job_portal
        print("✅ Connected to local MongoDB")
        return client, db
    except Exception as e:
        print(f"❌ Failed to connect to local MongoDB: {e}")
        return None, None

def connect_to_atlas():
    """Connect to MongoDB Atlas."""
    atlas_uri = os.getenv("MONGO_URI")
    
    if not atlas_uri or "localhost" in atlas_uri:
        print("❌ Please update your .env file with the MongoDB Atlas connection string")
        return None, None
    
    # Hide password in logs
    display_uri = atlas_uri
    if "@" in atlas_uri and "://" in atlas_uri:
        parts = atlas_uri.split("://")
        if len(parts) == 2:
            protocol = parts[0]
            rest = parts[1]
            if "@" in rest:
                credentials, host_part = rest.split("@", 1)
                if ":" in credentials:
                    username = credentials.split(":")[0]
                    display_uri = f"{protocol}://{username}:***@{host_part}"
    
    print(f"Connecting to MongoDB Atlas: {display_uri}")
    
    try:
        client = MongoClient(atlas_uri, serverSelectionTimeoutMS=10000)
        client.admin.command('ping')
        
        # Extract database name
        db_name = "job_portal"
        if "/" in atlas_uri.split("@")[1]:
            db_part = atlas_uri.split("@")[1].split("/")[1].split("?")[0]
            if db_part:
                db_name = db_part
        
        db = client[db_name]
        print("✅ Connected to MongoDB Atlas")
        return client, db
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB Atlas: {e}")
        return None, None

def migrate_collection(local_db, atlas_db, collection_name):
    """Migrate a single collection from local to Atlas."""
    print(f"\n📋 Migrating collection: {collection_name}")
    
    try:
        # Get local collection
        local_collection = local_db[collection_name]
        local_count = local_collection.count_documents({})
        
        if local_count == 0:
            print(f"   ⚠️  No documents found in local {collection_name}")
            return True
        
        print(f"   📊 Found {local_count} documents in local {collection_name}")
        
        # Get Atlas collection
        atlas_collection = atlas_db[collection_name]
        atlas_count_before = atlas_collection.count_documents({})
        print(f"   📊 Atlas {collection_name} currently has {atlas_count_before} documents")
        
        # Export all documents from local
        documents = list(local_collection.find({}))
        
        if documents:
            # Import to Atlas
            result = atlas_collection.insert_many(documents)
            print(f"   ✅ Inserted {len(result.inserted_ids)} documents")
            
            # Verify
            atlas_count_after = atlas_collection.count_documents({})
            print(f"   📈 Atlas {collection_name} now has {atlas_count_after} documents")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Failed to migrate {collection_name}: {e}")
        return False

def main():
    print("🚀 MongoDB Migration Tool: Local to Atlas")
    print("=" * 50)
    
    # Connect to local MongoDB
    local_client, local_db = connect_to_local()
    if not local_client:
        sys.exit(1)
    
    # Connect to Atlas
    atlas_client, atlas_db = connect_to_atlas()
    if not atlas_client:
        local_client.close()
        sys.exit(1)
    
    try:
        # Get list of collections from local database
        collections = local_db.list_collection_names()
        print(f"\n📁 Found collections in local database: {collections}")
        
        if not collections:
            print("⚠️  No collections found in local database")
            return
        
        # Ask for confirmation
        print(f"\n⚠️  This will migrate data from local MongoDB to Atlas.")
        print(f"   Local database: job_portal")
        print(f"   Atlas database: {atlas_db.name}")
        print(f"   Collections to migrate: {collections}")
        
        confirm = input("\nDo you want to proceed? (yes/no): ").lower().strip()
        if confirm not in ['yes', 'y']:
            print("Migration cancelled.")
            return
        
        # Migrate each collection
        success_count = 0
        for collection_name in collections:
            if migrate_collection(local_db, atlas_db, collection_name):
                success_count += 1
        
        print(f"\n🎉 Migration completed!")
        print(f"   Successfully migrated: {success_count}/{len(collections)} collections")
        
        if success_count == len(collections):
            print("\n✅ All data has been successfully migrated to MongoDB Atlas!")
            print("   You can now update your .env file to use Atlas and stop your local MongoDB.")
        else:
            print(f"\n⚠️  Some collections failed to migrate. Please check the errors above.")
    
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    
    finally:
        # Close connections
        local_client.close()
        atlas_client.close()

if __name__ == "__main__":
    main()
