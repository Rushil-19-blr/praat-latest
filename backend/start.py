#!/usr/bin/env python3
"""
Startup script for the Praat Voice Analysis Backend
"""

import os
import sys
import subprocess

def check_python_version():
    """Check if Python version is 3.8 or higher"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("Error: Failed to install dependencies")
        sys.exit(1)

def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = ".env"
    if not os.path.exists(env_file):
        with open(env_file, "w") as f:
            f.write("# Environment variables for Praat Voice Analysis Backend\n")
            f.write("FLASK_ENV=development\n")
            f.write("FLASK_DEBUG=True\n")
            f.write("# Add your API keys here if needed\n")
        print("✓ Created .env file")

def main():
    print("Starting Praat Voice Analysis Backend Setup")
    print("=" * 50)
    
    check_python_version()
    create_env_file()
    install_dependencies()
    
    print("\nSetup complete! Starting the server...")
    print("The backend will be available at: http://localhost:5000")
    print("API endpoint: http://localhost:5000/api/analyze-audio")
    print("\nPress Ctrl+C to stop the server")
    
    # Start the Flask app
    os.system("python app.py")

if __name__ == "__main__":
    main()
