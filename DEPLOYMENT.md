# Deployment Guide for Voice Stress Analysis App

This application has two parts: a **Frontend** (React/Vite) and a **Backend** (Python/Flask). Because they are separate, they should ideally be hosted on different specialized platforms.

## 1. Backend Deployment (Render.com)

We recommend **Render** for the backend because it natively supports Python and is easy to set up.

1.  **Push your code to GitHub** (if you haven't already).
2.  **Sign up/Log in to [Render.com](https://render.com/)**.
3.  Click **"New +"** and select **"Web Service"**.
4.  Connect your GitHub repository.
5.  **Configuration**:
    *   **Name**: `awaaz-backend` (or similar)
    *   **Root Directory**: `backend` (Important! This tells Render the app is in the backend folder)
    *   **Environment**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `gunicorn app:app` (We created a Procfile, but setting this explicitly is good practice)
    *   **Plan**: Free (if available) or Starter.
6.  **Advanced (Environment Variables)**:
    *   If you have any secrets (like `STREAM_API_SECRET`), you can add them here. Currently, they are in `app.py`, so it will work without adding them, but for security, you should eventually move them to environment variables.
7.  Click **"Create Web Service"**.
8.  **Wait for deployment**. Once finished, copy the **URL** (e.g., `https://awaaz-backend.onrender.com`). You will need this for the frontend!

## 2. Frontend Deployment (Vercel) - *Alternative to Netlify*

Vercel is another excellent choice for the frontend.

1.  **Sign up/Log in to [Vercel](https://vercel.com/)**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your GitHub repository.
4.  **Configure Project**:
    *   **Framework Preset**: It should auto-detect **Vite**.
    *   **Root Directory**: `./` (default)
5.  **Environment Variables**:
    *   Expand the **"Environment Variables"** section.
    *   Add:
        *   `VITE_API_URL`: Your backend URL (e.g., `https://awaaz-backend.onrender.com`).
        *   `VITE_GEMINI_API_KEY`: Your Gemini API Key.
6.  Click **"Deploy"**.

## 3. Frontend Deployment (Netlify)

Netlify is excellent for the React frontend.

1.  **Log in to [Netlify](https://www.netlify.com/)**.
2.  Click **"Add new site"** -> **"Import from existing project"**.
3.  Connect your GitHub repository.
4.  **Configuration**:
    *   **Base directory**: `.` (leave empty or default)
    *   **Build command**: `npm run build` (or `vite build`)
    *   **Publish directory**: `dist`
5.  **Environment Variables** (Crucial Step):
    *   Click on **"Show advanced"** or go to **Site Settings > Environment variables** after creation.
    *   Add a new variable:
        *   **Key**: `VITE_API_URL`
        *   **Value**: The URL of your deployed backend (e.g., `https://awaaz-backend.onrender.com`). **IMPORTANT**: Do not include a trailing slash `/`.
    *   Add your Gemini API Key:
        *   **Key**: `VITE_GEMINI_API_KEY` (or `API_KEY`)
        *   **Value**: Your Google Gemini API Key.
6.  **Deploy**.

## Troubleshooting

*   **"Unable to reach localhost"**: This happens because the deployed frontend is trying to talk to your *local* computer. By setting `VITE_API_URL` to the Render URL, the frontend will talk to the cloud backend.
*   **CORS Errors**: The backend is configured with `CORS(app)`, so it should accept requests from any domain.
*   **Backend Cold Starts**: On free tiers (Render/Railway), the backend might go to sleep. The first request might take 30-60 seconds to wake it up.

## Summary of Changes Made
*   **Frontend**: Updated `services/praat.ts` and components to use `VITE_API_URL` instead of hardcoded `localhost:8000`.
*   **Backend**: Updated `app.py` to listen on the port assigned by the hosting provider (`PORT` env var).
*   **Backend**: Added a `Procfile` for easy deployment.
