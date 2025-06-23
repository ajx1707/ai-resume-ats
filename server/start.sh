#!/bin/bash
# Start script for Render deployment

# Install dependencies
pip install -r requirements.txt

# Start the Flask app with Gunicorn
gunicorn --bind 0.0.0.0:$PORT app:app
