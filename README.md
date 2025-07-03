# My Google AI Studio Web App

This project is a simple **Node.js + HTML** web app that uses the **Google AI Studio API** to demonstrate AI text generation on a webpage.
It is designed to show a cleaner separation of frontend and backend responsibilities compared to an older, purely client-side approach "https://github.com/mks-mia/healthweb". This website focuses primarily on functionality, so the user interface is intentionally minimal.

## Features

- Uses **Node.js** as a backend server to handle API calls securely.
- Keeps the Google AI Studio API key in a local **`.env`** file (excluded from the repo).
- Serves an **index.html** file from the `public/` folder as the user interface.
- Clean separation of API logic (server) and display (HTML frontend).
- API key never exposed in client-side JavaScript.

## Security Best Practice

- The API key is stored in a **.env** file:
- **.env** is listed in `.gitignore` and is **NOT** pushed to GitHub.
- This prevents leaking your API key in a public repo.

## Difference from the Previous Version

Previously, I built a simpler webpage that:

- Used only **HTML**, **CSS**, and **JavaScript**.
- Called the Google AI Studio API **directly in client-side JavaScript** (`<script>` tag).
- Exposed the API key in the frontend code, making it public.

That approach is **insecure**, because anyone could see and steal the API key.
This new project fixes that by:
- Moving API calls to the **Node.js** backend.
- Hiding the API key on the server side.
- Serving a public frontend without exposing secrets.


