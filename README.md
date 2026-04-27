# Healthopia

A full-stack wellness community web app built with HTML, CSS, vanilla JavaScript, Node.js, Express, and MongoDB.

This project combines community posting, personalized wellness resources, and health tracking inside a single authenticated app experience. Users can create an account, join wellness communities, share posts, like and comment on posts, track activity, and view personalized wellness picks based on the communities they join.

## Link to webpage
  https://healthopia-8bvr.onrender.com/

## Link to the clean github repo 
  https://github.com/upendra-devhub/Healthopia_Backup
  if you want to see to repo withput any of the clutter please consider visiting the the provided link

## What the Project Includes

### Core product areas

- Authentication with registration, login, logout, and avatar selection
- Community discovery with join and leave actions
- Community-based feed and post detail pages
- Post creation with image upload pipeline using Multer and Cloudinary middleware
- Post likes with optimistic UI handling on the frontend
- Post comments
- Delete-your-own-comment support
- Health tracking for water, steps, running, and sleep
- A rolling 7-day Health Pulse view
- Personalized wellness resources filtered by joined communities
- Profile page with posts, liked posts, and profile stats
- Client-side saved posts support in the frontend

### Public and protected pages

- Public landing page
- Sign-in page
- Registration page
- Authenticated app shell for:
  - Home feed
  - Profile
  - Health
  - Wellness Picks
  - Community detail
  - Post detail

## Tech Stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript

### Backend

- Node.js
- Express
- MongoDB with Mongoose

### Deployment
  Render

### Other libraries

- `bcrypt` for password hashing
- `jsonwebtoken` for authentication tokens
- `cookie-parser` for cookie handling
- `multer` for image upload handling
- `cloudinary` for image upload storage flow
- `dotenv` for environment variables

## Project Structure

```text
health-wellness-community-main/
|-- public/
|   |-- css/
|   |-- js/
|   |-- avatars/
|   |-- images/
|   |-- landing.html
|   |-- sign-in.html
|   |-- register.html
|   |-- app.html
|-- src/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- utils/
|   |-- app.js
|-- tests/
|-- uploads/
|-- server.js
|-- package.json
```

## Main Application Flow

1. A visitor lands on the public landing page.
2. The user registers or signs in.
3. After authentication, the app serves `public/app.html`.
4. The frontend loads shell data such as profile, communities, and health info.
5. The user joins communities to personalize the experience.
6. Posts shown in the main feed are filtered by the communities the user has joined.
7. Wellness Picks are filtered by normalized community categories.
8. Health data is loaded and displayed in the Health Pulse dashboard.

## Key Features

### 1. Authentication

Implemented in:

- `src/controllers/authController.js`
- `src/middleware/auth.js`
- `src/utils/authTokens.js`

Capabilities:

- Register with username, email, password, and a selected avatar
- Password hashing using `bcrypt`
- Login with email and password
- Logout by clearing the auth cookie
- Protected API routes and protected page routes

Notes:

- Avatar choices are validated against the available preset avatar filenames
- A `HealthTracker` document is created automatically when a user registers

### 2. Communities

Implemented in:

- `src/controllers/communityController.js`
- `src/models/Community.js`

Capabilities:

- Fetch all communities
- Mark communities as joined or not joined for the current user
- Join a community
- Leave a community
- View posts inside a specific community

The app seeds starter communities at server startup from `src/config/seed.js`.

### 3. Posts, Likes, and Comments

Implemented in:

- `src/controllers/postController.js`
- `src/services/postLikeService.js`
- `src/models/Post.js`
- `public/js/app.js`
- `public/js/postLikeManager.js`

Capabilities:

- Create posts
- View feed posts
- View single post detail
- Delete your own post
- Like and unlike posts
- Add comments
- Delete your own comments

Behavior notes based on the current code:

- Feed posts default to communities joined by the signed-in user
- Likes are handled with optimistic frontend updates
- Comments are stored as embedded subdocuments on each `Post`
- Comment deletion is exposed through `DELETE /api/comments/:id`

### 4. Health Tracker

Implemented in:

- `src/controllers/healthController.js`
- `src/models/HealthTracker.js`
- `public/js/app.js`

Tracked values:

- Water intake
- Water goal
- Steps
- Running
- Sleep
- Daily activity logs

Current health behavior:

- The dashboard shows a rolling last 7 days window
- The selected day defaults to the real current day
- Daily log entries are stored in `dailyLogs`
- Today’s summary is synced back into the main tracker values when the logged date is today

### 5. Wellness Picks

Implemented in:

- `src/controllers/resourceController.js`
- `src/models/Resource.js`
- `src/config/resources.seed.json`

Capabilities:

- Fetch wellness resources personalized to the user’s joined communities
- Paginate resource results
- Sort results by priority and metadata

The server seeds starter resource data at startup.

### 6. Profile View

Implemented in:

- `src/controllers/userController.js`
- `public/js/app.js`

Capabilities:

- View the signed-in user profile
- View own posts
- View liked posts
- See profile stats:
  - total posts
  - communities joined
  - comments count on the user’s posts
  - likes count on the user’s posts

## Environment Variables

Create a `.env` file in the project root.

The code currently reads these environment variables:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Important notes:

- `src/config/env.js` uses `PORT`, `MONGODB_URI`, and `JWT_SECRET`
- Cloudinary configuration is read directly from `process.env` inside `src/middleware/cloudnire.upload.js`
- For GitHub, do not commit real secrets in `.env`

## Installation and Setup

### 1. Clone the project

```bash
git clone <your-repository-url>
cd health-wellness-community-main
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add environment variables

Create a `.env` file in the project root using the variables listed above.

### 4. Start the server

```bash
npm start
```

The app starts on:

```text
http://localhost:3000
```

## Available Scripts

### Run the app

```bash
npm start
```

### Development run

```bash
npm run dev
```

### Run tests

```bash
npm test
```

## API Overview

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### User

- `GET /api/users/profile`

### Communities

- `GET /api/communities`
- `GET /api/communities/:id`
- `POST /api/communities/:id/join`
- `DELETE /api/communities/:id/join`

### Posts

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/comment`

### Comments

- `DELETE /api/comments/:id`

### Health

- `GET /api/health`
- `PUT /api/health`
- `GET /api/health/today`
- `GET /api/health/weekly`
- `POST /api/health/log`

### Resources

- `GET /api/resources`
- `GET /api/resources/picks`

## Database Models

### User

Stores:

- `name`
- `email`
- `password`
- `username`
- `avatar`
- `posts`
- `likedPosts`
- `communitiesJoined`

### Community

Stores:

- `communityName`
- `description`
- `posts`
- `noOfActiveMembers`
- `communityPhoto`

### Post

Stores:

- author references
- title/body/description
- image metadata
- likes and liked users
- embedded comments
- tags
- community references

### HealthTracker

Stores:

- `userId`
- `waterIntake`
- `waterGoal`
- `steps`
- `running`
- `sleep`
- `dailyLogs`

### Resource

Stores:

- `title`
- `description`
- `category`
- `source`
- `communityTag`
- `readTime`
- `url`
- `priority`

## Frontend Notes

The frontend is a vanilla JavaScript single-app shell served through `public/app.html`.

Important frontend modules:

- `public/js/app.js` for app state, routing, rendering, feed interactions, profile, health, and wellness views
- `public/js/api.js` for API requests with cookie credentials
- `public/js/postLikeManager.js` for optimistic like state management
- `public/js/register.js` and `public/js/sign-in.js` for auth flows
- `public/js/landing.js` for landing page interactions

## Testing

This repository includes Node-based tests in the `tests/` folder.

Current test coverage includes checks around:

- post like behavior
- create post flow
- landing/avatar/resource regressions
- profile/theme regressions
- health tracker rolling 7-day logic
- delete-own-comment behavior

Run all tests with:

```bash
npm test
```

## Recent Functional Updates

The current codebase includes these logic updates:

- Health Tracker date handling uses a dynamic current date and rolling last 7 days logic
- Existing stored health data is mapped onto the correct daily keys
- Users can delete only their own comments through a protected API route and frontend action

## Notes for Publishing

Before uploading this project to GitHub:

- remove or rotate any real secrets stored in `.env`
- keep `.env` out of version control
- consider adding a `.env.example` file for safer setup sharing

## License

No license file is currently present in this repository.
