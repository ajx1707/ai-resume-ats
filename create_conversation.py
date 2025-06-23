import requests
import json

# First, let's login to get a valid token
login_url = "http://localhost:5000/api/login"
# Let's create a new user for testing
register_url = "http://localhost:5000/api/register"
register_data = {
    "name": "Test User",
    "email": "testuser@example.com",
    "password": "password123",
    "user_type": "applicant"
}

# Try to register the user (might fail if already exists, that's fine)
try:
    register_response = requests.post(register_url, json=register_data)
    print("Register response:", register_response.status_code)
except Exception as e:
    print("Registration error:", e)

# Now try to login
login_data = {
    "email": "testuser@example.com",
    "password": "password123"
}

login_response = requests.post(login_url, json=login_data)
print("Login response:", login_response.status_code)

if login_response.status_code != 200:
    print("Login failed:", login_response.json())
    exit(1)

# Extract token from login response
token = login_response.json().get("access_token")
print("Got token:", token[:20] + "...")

# Get user ID
user_response = requests.get(
    "http://localhost:5000/api/user",
    headers={"Authorization": f"Bearer {token}"}
)

if user_response.status_code != 200:
    print("Failed to get user info:", user_response.json())
    exit(1)

user_id = user_response.json().get("user", {}).get("id")
print("User ID:", user_id)

# Create a conversation
url = "http://localhost:5000/api/conversations"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}"
}
# For testing, let's create a new user to be our recipient
recipient_email = f"recipient_{user_id}@example.com"
recipient_name = "Test Recipient"
recipient_password = "password123"

# Check if the recipient already exists
recipient_login_response = requests.post(login_url, json={
    "email": recipient_email,
    "password": recipient_password
})

if recipient_login_response.status_code == 200:
    # Recipient exists, get their ID
    recipient_token = recipient_login_response.json().get("access_token")
    recipient_user_response = requests.get(
        "http://localhost:5000/api/user",
        headers={"Authorization": f"Bearer {recipient_token}"}
    )
    recipient_id = recipient_user_response.json().get("user", {}).get("id")
    print(f"Using existing recipient with ID: {recipient_id}")
else:
    # Create a new recipient
    register_response = requests.post(
        "http://localhost:5000/api/register",
        json={
            "name": recipient_name,
            "email": recipient_email,
            "password": recipient_password,
            "user_type": "recruiter"  # Make them a recruiter
        }
    )

    if register_response.status_code == 201:
        print("Created new recipient user")
        # Now login as the new user to get their ID
        recipient_login_response = requests.post(login_url, json={
            "email": recipient_email,
            "password": recipient_password
        })

        recipient_token = recipient_login_response.json().get("access_token")
        recipient_user_response = requests.get(
            "http://localhost:5000/api/user",
            headers={"Authorization": f"Bearer {recipient_token}"}
        )
        recipient_id = recipient_user_response.json().get("user", {}).get("id")
        print(f"Created new recipient with ID: {recipient_id}")
    else:
        print("Failed to create recipient:", register_response.json())
        # Use a fallback ID
        recipient_id = "65f05c49e2fadd1c4c34c34d"
        print(f"Using fallback recipient ID: {recipient_id}")

data = {
    "recipient_id": recipient_id
}

response = requests.post(url, headers=headers, json=data)
print("Create conversation response:", response.status_code)
print(response.json())

# If the conversation was created successfully, send a message
if response.status_code == 201 or response.status_code == 200:
    conversation_id = response.json().get("conversation_id")

    # Send a message
    message_url = f"http://localhost:5000/api/conversations/{conversation_id}/messages"
    message_data = {
        "content": "Hello! This is a test message."
    }

    message_response = requests.post(message_url, headers=headers, json=message_data)
    print("Send message response:", message_response.status_code)
    print(message_response.json())
