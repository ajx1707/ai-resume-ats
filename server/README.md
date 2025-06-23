# Flask + MongoDB Authentication Server

This is the backend authentication server for the job portal application using Flask and MongoDB.

## Setup Instructions

### Prerequisites
- Python 3.8+
- MongoDB (local installation or MongoDB Atlas account)
- Node.js and npm (for the frontend)

### Environment Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the server directory by copying `.env.example`:
```bash
cp .env.example .env
```

5. Update the `.env` file with your MongoDB connection string and a secure JWT secret:

   **For MongoDB Atlas (recommended for production):**
   ```
   JWT_SECRET_KEY=your_secure_secret_key
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/job_portal?retryWrites=true&w=majority
   GROQ_API_KEY=your_groq_api_key
   ```

   **For local MongoDB:**
   ```
   JWT_SECRET_KEY=your_secure_secret_key
   MONGO_URI=mongodb://localhost:27017/job_portal
   GROQ_API_KEY=your_groq_api_key
   ```

### Running the Server

Start the Flask server:
```bash
python app.py
```

The server will run on http://localhost:5000 by default.

## API Endpoints

### Authentication

- **Register**: `POST /api/register`
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```

- **Login**: `POST /api/login`
  ```json
  {
    "email": "john@example.com",
    "password": "securepassword"
  }
  ```

- **Get User**: `GET /api/user` (requires authentication)
  - Header: `Authorization: Bearer <token>`

## Frontend Integration

To connect the frontend to this backend:

1. Make sure the Flask server is running on port 5000
2. Update your frontend API calls to point to the Flask server
3. Use the JWT token for authenticated requests
4. Store the token in localStorage or a secure cookie

## Security Notes

- In production, make sure to:
  - Use HTTPS for all API calls
  - Set proper CORS policies
  - Use a more secure storage method for tokens
  - Host your MongoDB instance securely
  - Use a strong, randomly generated JWT secret
  - Set appropriate token expiration times 