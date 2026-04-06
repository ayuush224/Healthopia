# Soft Health

Soft Health is a beginner-friendly but scalable Express.js application built with:

- Express.js
- HTML
- CSS
- Vanilla JavaScript
- JSON file persistence

## Run the project

```bash
npm install
node server.js
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Features

- Bootstrap API for the whole UI
- Post creation
- Comments
- Likes
- Bookmarks
- Shares
- Tracker updates
- Responsive frontend
- Request logging
- Error handling middleware

## Project structure

```text
.
|-- controllers/
|   |-- bootstrapController.js
|   |-- commentsController.js
|   |-- postsController.js
|   `-- trackerController.js
|-- data/
|   `-- app-data.json
|-- middleware/
|   |-- errorHandler.js
|   |-- logger.js
|   |-- notFound.js
|   `-- validators.js
|-- public/
|   |-- js/
|   |   |-- api.js
|   |   |-- app.js
|   |   `-- render.js
|   |-- index.html
|   `-- styles.css
|-- routes/
|   |-- bootstrapRoutes.js
|   |-- commentsRoutes.js
|   |-- postsRoutes.js
|   `-- trackerRoutes.js
|-- services/
|   |-- dataStore.js
|   `-- feedService.js
|-- utils/
|   |-- AppError.js
|   `-- asyncHandler.js
|-- package.json
|-- package-lock.json
`-- server.js
```
