# Educrat - Online Learning Platform

A modern online learning platform built with Node.js, Express, and EJS templating engine.

## Features

- 🏠 **Homepage** - Modern landing page with course showcase
- 📚 **Course Catalog** - Browse and search courses with filtering
- 👤 **User Authentication** - Secure login/signup with session management
- 📱 **Responsive Design** - Mobile-friendly interface
- 🔒 **Security** - Helmet.js security headers and CSRF protection
- ⚡ **Performance** - Gzip compression and optimized assets

## Tech Stack

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS
- **Authentication**: Express Session, bcryptjs
- **Security**: Helmet.js, express-validator
- **Styling**: Bootstrap 5, Custom CSS
- **Performance**: Compression middleware

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd educrat-ejs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your-secure-secret-key
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
educrat-ejs/
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── views/                # EJS templates
│   ├── pages/           # Main page templates
│   └── partials/        # Reusable components
├── public/              # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── images/         # Image assets
└── README.md           # Project documentation
```

## Available Routes

- `GET /` - Homepage
- `GET /courses` - Course catalog
- `GET /course/:id` - Course details
- `GET /login` - Login page
- `POST /login` - Login form handler
- `GET /signup` - Registration page
- `POST /signup` - Registration form handler
- `POST /logout` - Logout handler

## Authentication

The application includes a complete authentication system:

- **Registration**: Users can create accounts with email and password
- **Login**: Secure login with bcrypt password hashing
- **Sessions**: Express sessions for user state management
- **Protection**: Route protection middleware for authenticated areas

## Security Features

- **Helmet.js**: Security headers and XSS protection
- **CSRF Protection**: Cross-site request forgery prevention
- **Password Hashing**: bcrypt for secure password storage
- **Session Security**: HTTP-only cookies and secure session configuration
- **Input Validation**: express-validator for form validation

## Performance Optimizations

- **Gzip Compression**: Reduced response sizes
- **Static File Caching**: Efficient asset delivery
- **Minified Assets**: Optimized CSS and JavaScript
- **Image Optimization**: Compressed images for faster loading

## Deployment

### Environment Variables

For production deployment, set these environment variables:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-production-secret-key
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a strong `SESSION_SECRET`
- [ ] Enable HTTPS in production
- [ ] Configure proper logging
- [ ] Set up process management (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up database (if needed)
- [ ] Configure file uploads (if needed)

### Deployment Platforms

**Heroku**
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret
git push heroku main
```

**Railway**
```bash
railway login
railway new
railway up
```

**DigitalOcean App Platform**
- Connect your GitHub repository
- Set environment variables in the dashboard
- Deploy automatically on push

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (to be implemented)

### Adding New Features

1. Create new routes in `app.js`
2. Add corresponding EJS templates in `views/pages/`
3. Update navigation in `views/partials/header.ejs`
4. Add any required middleware or validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository.