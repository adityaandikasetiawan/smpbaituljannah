require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { pool, dbHelpers } = require('./database-mysql');

// Load school content data
const schoolContentPath = path.join(__dirname, 'data', 'school-content.json');
const schoolContent = JSON.parse(fs.readFileSync(schoolContentPath, 'utf8'));
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('App.js loaded, setting up middleware...');
console.log('=== TESTING CONSOLE LOG FUNCTIONALITY ===');

// Add a simple middleware to log ALL requests
app.use((req, res, next) => {
  console.log('*** FIRST MIDDLEWARE - ALL REQUESTS ***', req.method, req.url);
  // Also log to file to ensure we can see it
  const logMessage = `${new Date().toISOString()} - FIRST MIDDLEWARE: ${req.method} ${req.url}\n`;
  fs.appendFileSync(path.join(__dirname, 'first_middleware.log'), logMessage);
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'news');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'news-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('File harus berupa gambar (JPG, PNG, GIF, WebP) - akan dikonversi otomatis ke WebP'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdn.quilljs.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://cdn.quilljs.com", "https://code.jquery.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'baituljannah-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Enable secure cookies in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true // Prevent XSS attacks
  }
}));

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// HTTP request logging
app.use(morgan('combined'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
app.use((req, res, next) => {
  // Write to file for debugging
  const logMessage = `${new Date().toISOString()} - ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}\n`;
  fs.appendFileSync(path.join(__dirname, 'debug.log'), logMessage);
  
  console.log('=== MIDDLEWARE CALLED ===');
  console.log(`${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  console.log('=== END MIDDLEWARE ===');
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Simple in-memory user database (replace with real database in production)
const users = [
  {
    id: 1,
    name: 'John Doe',
    username: 'john',
    email: 'john@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  },
  {
    id: 2,
    name: 'Jane Smith',
    username: 'jane',
    email: 'jane@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  }
];

// Helper function to find user by username
const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

// Helper function to find user by email (kept for backward compatibility)
const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

// Helper function to create new user
const createUser = (name, username, email, hashedPassword) => {
  const newUser = {
    id: users.length + 1,
    name,
    username,
    email,
    password: hashedPassword
  };
  users.push(newUser);
  return newUser;
};

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Admin authentication middleware
const requireAdminAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Sample data for home page
const coursesData = [
  {
    id: 1,
    title: 'Complete Web Development Course',
    instructor: 'John Smith',
    rating: 4.8,
    students: 2847,
    price: 89,
    originalPrice: 129,
    image: '/img/coursesCards/1.png',
    category: 'Web Development',
    duration: '12 hours',
    lessons: 24
  },
  {
    id: 2,
    title: 'Digital Marketing Masterclass',
    instructor: 'Sarah Johnson',
    rating: 4.9,
    students: 1923,
    price: 79,
    originalPrice: 119,
    image: '/img/coursesCards/2.png',
    category: 'Marketing',
    duration: '8 hours',
    lessons: 16
  },
  {
    id: 3,
    title: 'UI/UX Design Fundamentals',
    instructor: 'Mike Wilson',
    rating: 4.7,
    students: 3156,
    price: 99,
    originalPrice: 149,
    image: '/img/coursesCards/3.png',
    category: 'Design',
    duration: '15 hours',
    lessons: 30
  },
  {
    id: 4,
    title: 'Python Programming for Beginners',
    instructor: 'Emily Davis',
    rating: 4.6,
    students: 2234,
    price: 69,
    originalPrice: 99,
    image: '/img/coursesCards/4.png',
    category: 'Programming',
    duration: '20 hours',
    lessons: 40
  }
];

const categoriesData = [
  { name: 'Web Development', icon: 'icon-laptop', courses: 25, color: '#FF6B6B' },
  { name: 'Digital Marketing', icon: 'icon-megaphone', courses: 18, color: '#4ECDC4' },
  { name: 'UI/UX Design', icon: 'icon-paint-brush', courses: 22, color: '#45B7D1' },
  { name: 'Programming', icon: 'icon-code', courses: 31, color: '#96CEB4' },
  { name: 'Business', icon: 'icon-briefcase', courses: 15, color: '#FFEAA7' },
  { name: 'Photography', icon: 'icon-camera', courses: 12, color: '#DDA0DD' }
];

const testimonialsData = [
  {
    id: 1,
    name: 'John Doe',
    role: 'Web Developer',
    image: '/img/testimonials/1.png',
    rating: 5,
    text: 'SMPIT Baituljannah telah mengubah pengalaman belajar saya. Program-programnya terstruktur dengan baik dan para pengajar sangat berkualitas.'
  },
  {
    id: 2,
    name: 'Jane Smith',
    role: 'Digital Marketer',
    image: '/img/testimonials/2.png',
    rating: 5,
    text: 'I love the interactive approach and the practical projects. It really helps in understanding the concepts better.'
  },
  {
    id: 3,
    name: 'Mike Johnson',
    role: 'UI/UX Designer',
    image: '/img/testimonials/3.png',
    rating: 4,
    text: 'The platform is user-friendly and the course content is always up-to-date with industry standards.'
  }
];

// Sample data for courses page
const allCoursesData = [
  {
    id: 1,
    title: 'Complete Web Development Bootcamp',
    category: 'Development',
    instructor: 'John Smith',
    price: 89,
    originalPrice: 129,
    rating: 4.8,
    reviews: 1250,
    image: '/img/courses/1.jpg',
    lessons: 45,
    duration: '12 hours',
    level: 'Beginner',
    badge: 'BEST SELLER',
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    title: 'Digital Marketing Masterclass',
    category: 'Marketing',
    instructor: 'Sarah Johnson',
    price: 79,
    originalPrice: 99,
    rating: 4.6,
    reviews: 890,
    image: '/img/courses/2.jpg',
    lessons: 32,
    duration: '8 hours',
    level: 'Intermediate',
    createdAt: '2024-01-10'
  },
  {
    id: 3,
    title: 'UI/UX Design Fundamentals',
    category: 'Design',
    instructor: 'Mike Wilson',
    price: 69,
    rating: 4.9,
    reviews: 567,
    image: '/img/courses/3.jpg',
    lessons: 28,
    duration: '10 hours',
    level: 'Beginner',
    badge: 'POPULAR',
    createdAt: '2024-01-20'
  },
  {
    id: 4,
    title: 'Photography for Beginners',
    category: 'Photography',
    instructor: 'Emma Davis',
    price: 59,
    originalPrice: 89,
    rating: 4.7,
    reviews: 432,
    image: '/img/courses/4.jpg',
    lessons: 24,
    duration: '6 hours',
    level: 'Beginner',
    createdAt: '2024-01-05'
  },
  {
    id: 5,
    title: 'Business Strategy & Planning',
    category: 'Business',
    instructor: 'Robert Brown',
    price: 99,
    rating: 4.5,
    reviews: 678,
    image: '/img/courses/5.jpg',
    lessons: 38,
    duration: '14 hours',
    level: 'Advanced',
    createdAt: '2024-01-12'
  },
  {
    id: 6,
    title: 'Social Media Marketing',
    category: 'Marketing',
    instructor: 'Lisa Anderson',
    price: 49,
    originalPrice: 79,
    rating: 4.4,
    reviews: 345,
    image: '/img/courses/6.jpg',
    lessons: 20,
    duration: '5 hours',
    level: 'Beginner',
    createdAt: '2024-01-08'
  },
  {
    id: 7,
    title: 'JavaScript Advanced Concepts',
    category: 'Development',
    instructor: 'David Lee',
    price: 109,
    rating: 4.8,
    reviews: 789,
    image: '/img/courses/7.jpg',
    lessons: 52,
    duration: '18 hours',
    level: 'Advanced',
    badge: 'NEW',
    createdAt: '2024-01-25'
  },
  {
    id: 8,
    title: 'Graphic Design Essentials',
    category: 'Design',
    instructor: 'Anna Taylor',
    price: 75,
    originalPrice: 95,
    rating: 4.6,
    reviews: 456,
    image: '/img/courses/8.jpg',
    lessons: 30,
    duration: '9 hours',
    level: 'Intermediate',
    createdAt: '2024-01-18'
  }
];

const courseCategoriesData = [
  { name: 'Architecture', count: 22 },
  { name: 'Art & Design', count: 204 },
  { name: 'Business', count: 65 },
  { name: 'Data Science', count: 98 },
  { name: 'Development', count: 126 },
  { name: 'Finance', count: 31 },
  { name: 'Health & Fitness', count: 47 },
  { name: 'Lifestyle', count: 73 },
  { name: 'Marketing', count: 89 },
  { name: 'Music', count: 52 },
  { name: 'Photography', count: 41 },
  { name: 'Teaching', count: 38 },
  { name: 'Technology', count: 156 }
];

// Course Detail Data
const courseDetailData = {
  title: 'User Experience Design Essentials - Adobe XD UI UX Design',
  description: 'Use XD to get a job in UI Design, User Interface, User Experience design, UX design & Web Design',
  fullDescription: 'This comprehensive course will teach you everything you need to know about User Experience Design using Adobe XD. You\'ll learn the fundamentals of UX design, how to create wireframes, prototypes, and high-fidelity designs that will help you land your dream job in the design industry.',
  category: 'User Experience Design',
  rating: 4.5,
  reviewCount: 1991,
  enrolledCount: 853,
  lastUpdated: '11/2021',
  price: 96.00,
  originalPrice: 76.00,
  image: '/img/misc/1.png',
  backgroundImage: '/img/event-single/bg.png',
  previewVideo: 'https://www.youtube.com/watch?v=ANYfx4-jyqY',
  lessons: 20,
  quizzes: 3,
  duration: '13 Hours',
  level: 'Beginner',
  language: 'English',
  certificate: true,
  badges: [
    { text: 'BEST SELLER', class: 'bg-green-1 text-dark-1' },
    { text: 'NEW', class: 'bg-orange-1 text-white' },
    { text: 'POPULAR', class: 'bg-purple-1 text-white' }
  ],
  author: {
    name: 'Ali Tufan',
    avatar: '/img/avatars/small-1.png'
  },
  learningOutcomes: [
    'Master the fundamentals of User Experience Design',
    'Create wireframes and prototypes using Adobe XD',
    'Design high-fidelity user interfaces',
    'Understand user research and testing methods',
    'Build a professional UX design portfolio',
    'Learn industry best practices and design principles'
  ],
  curriculum: [
    {
      title: 'Getting started with Adobe XD',
      lectures: 5,
      duration: '87 min',
      lessons: [
        {
          title: 'Introduction to the User Experience Course',
          duration: '03:56',
          preview: true,
          quiz: 5
        },
        {
          title: 'Getting started with your Adobe XD project',
          duration: '03:56',
          preview: true,
          quiz: 5
        },
        {
          title: 'What is UI vs UX - User Interface vs User Experience vs Product Designer',
          duration: '03:56',
          preview: true,
          quiz: 5
        },
        {
          title: 'Wireframing (low fidelity) in Adobe XD',
          duration: '03:56',
          preview: true,
          quiz: 5
        },
        {
          title: 'Viewing your prototype on a mobile device',
          duration: '03:56',
          preview: true,
          quiz: 5
        }
      ]
    },
    {
      title: 'Prototyping a App - Introduction',
      lectures: 5,
      duration: '87 min',
      lessons: [
        {
          title: 'Introduction to prototyping',
          duration: '03:56',
          preview: false,
          quiz: 3
        },
        {
          title: 'Creating interactive elements',
          duration: '05:30',
          preview: false,
          quiz: 4
        },
        {
          title: 'Advanced prototyping techniques',
          duration: '07:45',
          preview: false,
          quiz: 5
        }
      ]
    },
    {
      title: 'Wireframe Feedback',
      lectures: 3,
      duration: '45 min',
      lessons: [
        {
          title: 'Collecting user feedback',
          duration: '04:20',
          preview: false,
          quiz: 3
        },
        {
          title: 'Iterating on designs',
          duration: '06:15',
          preview: false,
          quiz: 4
        }
      ]
    }
  ]
};

// Simple user storage (in production, use a database)
let messages = [];

// Routes
// Simple test route
app.get('/simple-test', (req, res) => {
  console.log('=== SIMPLE TEST ROUTE ACCESSED ===');
  res.json({ message: 'Simple test route working', timestamp: new Date().toISOString() });
});

app.get('/', async (req, res) => {
  try {
    // Ambil 3 berita terbaru yang published
    const latestNews = await dbHelpers.getAllNews({ status: 'published', limit: 3 });
    
    // Ambil testimoni aktif dari database
    const testimonials = await dbHelpers.getActiveTestimonials();
    
    // Ambil slider aktif dari database
    const sliders = await dbHelpers.getActiveSliders();
    
    res.render('home', {
      title: 'SMPIT Baituljannah - Sekolah Islam Terpadu',
      categories: categoriesData,
      courses: coursesData,
      testimonials: testimonials || testimonialsData, // fallback ke data placeholder
      sliders: sliders || [],
      schoolContent: schoolContent,
      latestNews: latestNews || []
    });
  } catch (error) {
    console.error('Error fetching data for homepage:', error);
    res.render('home', {
      title: 'SMPIT Baituljannah - Sekolah Islam Terpadu',
      categories: categoriesData,
      courses: coursesData,
      testimonials: testimonialsData, // fallback ke data placeholder
      sliders: [],
      schoolContent: schoolContent,
      latestNews: []
    });
  }
});

app.get('/courses', (req, res) => {
  const { search, category, sort } = req.query;
  let filteredCourses = [...allCoursesData];
  
  // Search functionality
  if (search) {
    filteredCourses = filteredCourses.filter(course => 
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.instructor.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Category filter
  if (category && category !== 'all') {
    filteredCourses = filteredCourses.filter(course => 
      course.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Sort functionality
  if (sort) {
    switch (sort) {
      case 'price-low':
        filteredCourses.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredCourses.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filteredCourses.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filteredCourses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'popular':
         filteredCourses.sort((a, b) => b.students - a.students);
         break;
      default:
        // Default sort by title
        filteredCourses.sort((a, b) => a.title.localeCompare(b.title));
    }
  }
  
  res.render('courses', {
    title: 'Program - Baituljannah',
    allCoursesData: filteredCourses,
    categories: courseCategoriesData,
    searchQuery: search || '',
    selectedCategory: category || 'all',
    selectedSort: sort || 'default',
    totalResults: filteredCourses.length
  });
});

app.get('/course/:id', (req, res) => {
  const courseId = req.params.id;
  const course = courseDetailData;
  res.render('course-detail', { course });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'Tentang - Baituljannah' });
});

// School pages routes
app.get('/sejarah', (req, res) => {
  res.render('sejarah', {
    sejarah: schoolContent.sejarah
  });
});

app.get('/visi-misi', (req, res) => {
  res.render('visi-misi', {
    visiMisi: schoolContent.visi_misi
  });
});

app.get('/program-unggulan', (req, res) => {
  res.render('program-unggulan', {
    programUnggulan: schoolContent.program_unggulan
  });
});

app.get('/kurikulum', (req, res) => {
  res.render('kurikulum', {
    kurikulum: schoolContent.kurikulum
  });
});

app.get('/fasilitas', (req, res) => {
  res.render('fasilitas', {
    fasilitas: schoolContent.fasilitas
  });
});

app.get('/prestasi', (req, res) => {
  res.render('prestasi', {
    prestasi: schoolContent.prestasi
  });
});

app.get('/faq', (req, res) => {
  res.render('faq', {
    faq: schoolContent.faq
  });
});

app.get('/pertanyaan-umum', (req, res) => {
  res.render('faq', {
    faq: schoolContent.faq
  });
});

// Contact routes
app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Kontak - Baituljannah' });
});

app.post('/contact', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('message').notEmpty().withMessage('Message is required')
], (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('contact', {
      title: 'Kontak - Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }
  
  // Save message (in production, save to database)
  messages.push({
    id: messages.length + 1,
    name: req.body.name,
    email: req.body.email,
    message: req.body.message,
    date: new Date()
  });
  
  res.render('contact', {
    title: 'Kontak - Baituljannah',
    success: true
  });
});

// Authentication routes
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - Baituljannah' });
});

app.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('login', {
      title: 'Login - Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }
  
  const { username, password } = req.body;
  const user = findUserByUsername(username);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.render('login', {
      title: 'Login - Baituljannah',
      errors: ['Invalid username or password'],
      formData: req.body
    });
  }
  
  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email
  };
  
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Daftar Akun - SMPIT Baituljannah' });
});

app.post('/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('signup', {
      title: 'Daftar - Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }
  
  const { name, username, email, password } = req.body;
  
  // Check if user already exists by email
  const existingUserByEmail = findUserByEmail(email);
  if (existingUserByEmail) {
    return res.render('signup', {
      title: 'Daftar - Baituljannah',
      errors: ['User with this email already exists'],
      formData: req.body
    });
  }
  
  // Check if username already exists
  const existingUserByUsername = findUserByUsername(username);
  if (existingUserByUsername) {
    return res.render('signup', {
      title: 'Daftar - Baituljannah',
      errors: ['Username already exists'],
      formData: req.body
    });
  }
  
  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = createUser(name, username, email, hashedPassword);
  
  // Auto-login the new user
  req.session.user = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email
  };
  
  res.redirect('/');
});

// Consultation routes
app.get('/konsultasi', (req, res) => {
  res.render('konsultasi', { title: 'Konsultasi - SMPIT Baituljannah' });
});

app.post('/konsultasi', [
  body('name').notEmpty().withMessage('Nama lengkap wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('phone').notEmpty().withMessage('Nomor telepon wajib diisi'),
  body('consultationType').notEmpty().withMessage('Jenis konsultasi wajib dipilih'),
  body('message').notEmpty().withMessage('Pesan/pertanyaan wajib diisi')
], (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('konsultasi', {
      title: 'Konsultasi - SMPIT Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }
  
  // Save consultation request (in production, save to database)
  const consultation = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    consultationType: req.body.consultationType,
    message: req.body.message,
    date: new Date(),
    status: 'pending'
  };
  
  // In production, save to database
  console.log('New consultation request:', consultation);
  
  res.render('konsultasi', {
    title: 'Konsultasi - SMPIT Baituljannah',
    success: true
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

// Portal siswa route
app.get('/portal-siswa', (req, res) => {
  res.render('portal-siswa', { title: 'Portal Siswa - SMPIT Baituljannah' });
});

// Test route right after portal-siswa
app.get('/test-after-portal', (req, res) => {
  res.json({ message: 'Test after portal working', location: 'after-portal-siswa' });
});

// Emergency test route
app.get('/emergency-test', (req, res) => {
  res.json({ message: 'Emergency test working', status: 'OK' });
});

// Test berita route
app.get('/berita-test', (req, res) => {
  console.log('=== BERITA TEST ROUTE ACCESSED ===');
  res.json({ message: 'Berita test route working', timestamp: new Date().toISOString() });
});

// Another test route
app.get('/berita-debug', (req, res) => {
  res.json({ message: 'Berita debug route working', path: req.path });
});

// Berita routes - both /berita and /berita-page point to the same handler
const beritaHandler = async (req, res) => {
  try {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // 4 berita per halaman
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const totalNews = await dbHelpers.getNewsCount({ status: 'published' });
    const totalPages = Math.ceil(totalNews / limit);
    
    // Get news with pagination
    const news = await dbHelpers.getAllNews({ 
      status: 'published', 
      limit: limit,
      offset: offset
    });
    
    res.render('berita', {
      title: 'Berita Terbaru - SMPIT Baituljannah',
      news: news || [],
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
    
  } catch (error) {
    logMessage += `Error in berita route: ${error.message}\n`;
    logMessage += `Error stack: ${error.stack}\n`;
    
    if (!res.headersSent) {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Terjadi kesalahan saat memuat berita',
        error: error
      });
    }
  }
  
  try {
    fs.appendFileSync('berita_debug.log', logMessage);
  } catch (fsError) {
    console.error('File system error at end:', fsError);
  }
};

// Test route to verify Express is working
console.log('About to register test-express route');
app.get('/test-express', (req, res) => {
  const logMessage = `${new Date().toISOString()} - TEST ROUTE CALLED: ${req.method} ${req.url}\n`;
  fs.appendFileSync(path.join(__dirname, 'route_debug.log'), logMessage);
  res.send('Express is working!');
});
console.log('test-express route registered successfully');

// Main berita route
console.log('About to register /berita route with beritaHandler');
app.get('/berita', (req, res) => {
  // Log to file instead of console
  const logMessage = `${new Date().toISOString()} - ROUTE HANDLER CALLED: ${req.method} ${req.url}\n`;
  fs.appendFileSync(path.join(__dirname, 'route_debug.log'), logMessage);
  
  console.log('=== /berita route called directly ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  return beritaHandler(req, res);
});
console.log('/berita route registered successfully');

// Alternative berita route (for backward compatibility)
app.get('/berita-page', beritaHandler);

// Berita detail route - using slug parameter
app.get('/berita/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    console.log(`=== BERITA DETAIL ROUTE ACCESSED: ${slug} ===`);
    
    // Get news by slug
    const news = await dbHelpers.getNewsBySlug(slug);
    
    if (!news) {
      console.log(`News with slug '${slug}' not found`);
      return res.status(404).render('404', {
        title: 'Berita Tidak Ditemukan - SMPIT Baituljannah'
      });
    }
    
    console.log(`Found news: ${news.title}`);
    
    // Render detail page
    res.render('berita-detail', {
      title: `${news.title} - SMPIT Baituljannah`,
      news: news
    });
    
  } catch (error) {
    console.error('Error in berita detail route:', error);
    res.status(500).render('500', {
      title: 'Server Error - SMPIT Baituljannah'
    });
  }
});
console.log('/berita/:slug route registered successfully');



// Student registration routes
// GET route for registration form
app.get('/daftar-siswa', (req, res) => {
  res.render('daftar-siswa', {
    title: 'Pendaftaran Siswa Baru - SMPIT Baituljannah',
    errors: [],
    formData: {}
  });
});

// POST route for registration form submission
app.post('/daftar-siswa', [
  body('namaLengkap').notEmpty().withMessage('Nama lengkap wajib diisi'),
  body('tempatLahir').notEmpty().withMessage('Tempat lahir wajib diisi'),
  body('tanggalLahir').isDate().withMessage('Tanggal lahir tidak valid'),
  body('jenisKelamin').isIn(['Laki-laki', 'Perempuan']).withMessage('Jenis kelamin tidak valid'),
  body('agama').notEmpty().withMessage('Agama wajib diisi'),
  body('alamat').notEmpty().withMessage('Alamat wajib diisi'),
  body('asalSekolah').notEmpty().withMessage('Asal sekolah wajib diisi'),
  body('alamatSekolah').notEmpty().withMessage('Alamat sekolah wajib diisi'),
  body('tahunLulus').isInt({ min: 2020, max: 2024 }).withMessage('Tahun lulus tidak valid'),
  body('namaAyah').notEmpty().withMessage('Nama ayah wajib diisi'),
  body('namaIbu').notEmpty().withMessage('Nama ibu wajib diisi'),
  body('pekerjaanAyah').notEmpty().withMessage('Pekerjaan ayah wajib diisi'),
  body('pekerjaanIbu').notEmpty().withMessage('Pekerjaan ibu wajib diisi'),
  body('noTeleponOrtu').notEmpty().withMessage('No. telepon orang tua wajib diisi'),
  body('programPilihan').isIn(['Reguler', 'Tahfidz', 'Sains', 'Bahasa']).withMessage('Program pilihan tidak valid'),
  body('email').optional().isEmail().withMessage('Format email tidak valid'),
  body('emailOrtu').optional().isEmail().withMessage('Format email orang tua tidak valid')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('daftar-siswa', {
      title: 'Pendaftaran Siswa Baru - SMPIT Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }

  try {
    // Create student registration data object
    const studentData = {
      namaLengkap: req.body.namaLengkap,
      tempatLahir: req.body.tempatLahir,
      tanggalLahir: req.body.tanggalLahir,
      jenisKelamin: req.body.jenisKelamin,
      agama: req.body.agama,
      alamat: req.body.alamat,
      noTelepon: req.body.noTelepon || null,
      email: req.body.email || null,
      asalSekolah: req.body.asalSekolah,
      alamatSekolah: req.body.alamatSekolah,
      tahunLulus: parseInt(req.body.tahunLulus),
      namaAyah: req.body.namaAyah,
      namaIbu: req.body.namaIbu,
      pekerjaanAyah: req.body.pekerjaanAyah,
      pekerjaanIbu: req.body.pekerjaanIbu,
      noTeleponOrtu: req.body.noTeleponOrtu,
      emailOrtu: req.body.emailOrtu || null,
      programPilihan: req.body.programPilihan,
      motivasi: req.body.motivasi || null
    };

    // Save to database
    await dbHelpers.createStudentRegistration(studentData);
    
    // Success - render form with success message
    res.render('daftar-siswa', {
      title: 'Pendaftaran Siswa Baru - SMPIT Baituljannah',
      success: true,
      errors: [],
      formData: {}
    });
  } catch (error) {
    console.error('Database error:', error);
    res.render('daftar-siswa', {
      title: 'Pendaftaran Siswa Baru - SMPIT Baituljannah',
      errors: ['Terjadi kesalahan sistem. Silakan coba lagi.'],
      formData: req.body
    });
  }
})

// Admin Routes
// Admin login page
app.get('/admin/login', (req, res) => {
  console.log('GET /admin/login endpoint called');
  if (req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', {
    title: 'Admin Login - SMPIT Baituljannah',
    errors: [],
    formData: {}
  });
});

// Admin login POST
app.post('/admin/login', [
  body('username').notEmpty().withMessage('Username wajib diisi'),
  body('password').notEmpty().withMessage('Password wajib diisi')
], async (req, res) => {
  console.log('Admin login endpoint called with:', req.body);
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('admin-login', {
      title: 'Admin Login - SMPIT Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }

  const { username, password } = req.body;
  
  try {
    const admin = await dbHelpers.authenticateAdmin(username, password);
    
    if (!admin) {
      return res.render('admin-login', {
        title: 'Admin Login - SMPIT Baituljannah',
        errors: ['Username atau password salah.'],
        formData: req.body
      });
    }
    
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    // Log login activity
    try {
      console.log('Attempting to log login activity for admin:', admin.id, admin.username);
      console.log('IP:', req.ip, 'User-Agent:', req.get('User-Agent'));
      await dbHelpers.logActivity(
        admin.id,
        'Login Admin',
        `Admin ${admin.username} berhasil login`,
        req.ip,
        req.get('User-Agent')
      );
      console.log('Login activity logged successfully');
    } catch (logError) {
      console.error('Error logging login activity:', logError);
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Database error:', err);
    return res.render('admin-login', {
      title: 'Admin Login - SMPIT Baituljannah',
      errors: ['Terjadi kesalahan sistem. Silakan coba lagi.'],
      formData: req.body
    });
  }
});

// Admin dashboard
app.get('/admin/dashboard', requireAdminAuth, async (req, res) => {
  try {
    // Get admin user data
    const adminUser = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    
    let stats = { total: 0, pending: 0, approved: 0, today: 0 };
    let recentRegistrations = [];
    
    try {
      stats = await dbHelpers.getRegistrationStats();
    } catch (err) {
      console.error('Error getting registration stats:', err);
    }
    
    try {
      recentRegistrations = await dbHelpers.getRecentRegistrations(5);
    } catch (err) {
      console.error('Error getting recent registrations:', err);
    }
    
    res.render('admin-dashboard', {
      title: 'Admin Dashboard - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      adminUser: adminUser || { full_name: 'Administrator' },
      stats,
      recentRegistrations
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});

// Admin registrations management
app.get('/admin/registrations', requireAdminAuth, async (req, res) => {
  const { status, program } = req.query;
  
  try {
    const registrations = await dbHelpers.getStudentRegistrations({ status, program });
    
    res.render('admin-registrations', {
      title: 'Kelola Pendaftaran - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      registrations,
      currentStatus: status || '',
      currentProgram: program || ''
    });
  } catch (err) {
    console.error('Database error:', err);
    res.render('admin-registrations', {
      title: 'Kelola Pendaftaran - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      registrations: [],
      currentStatus: status || '',
      currentProgram: program || ''
    });
  }
});

// Export registrations with multiple formats
app.get('/admin/registrations/export', requireAdminAuth, async (req, res) => {
  try {
    const { ids, format = 'csv', type, status, program, name, dateFrom, dateTo } = req.query;
    let registrations;
    
    if (ids && ids.length > 0) {
      // Export selected registrations
      const selectedIds = Array.isArray(ids) ? ids : [ids];
      registrations = [];
      
      for (const id of selectedIds) {
        const registration = await dbHelpers.getStudentRegistrationById(id);
        if (registration) {
          registrations.push(registration);
        }
      }
    } else if (type === 'all') {
      // Export all registrations without filters
      registrations = await dbHelpers.getAllStudentRegistrations();
    } else {
      // Export with filters
      const filters = {};
      if (status) filters.status = status;
      if (program) filters.program = program;
      
      registrations = await dbHelpers.getStudentRegistrations(filters);
      
      // Apply additional client-side filters
      if (name) {
        registrations = registrations.filter(reg => 
          reg.nama_lengkap.toLowerCase().includes(name.toLowerCase())
        );
      }
      
      if (dateFrom || dateTo) {
        registrations = registrations.filter(reg => {
          const regDate = new Date(reg.created_at);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && regDate < fromDate) return false;
          if (toDate && regDate > toDate) return false;
          return true;
        });
      }
    }

    // Transform data for export
    const exportData = registrations.map(reg => ({
      'No': reg.id,
      'Nama Lengkap': reg.nama_lengkap,
      'Tempat Lahir': reg.tempat_lahir,
      'Tanggal Lahir': new Date(reg.tanggal_lahir).toLocaleDateString('id-ID'),
      'Jenis Kelamin': reg.jenis_kelamin,
      'Agama': reg.agama,
      'Alamat': reg.alamat,
      'No Telepon': reg.no_telepon,
      'Email': reg.email,
      'Asal Sekolah': reg.asal_sekolah,
      'Alamat Sekolah': reg.alamat_sekolah,
      'Tahun Lulus': reg.tahun_lulus,
      'Nama Ayah': reg.nama_ayah,
      'Nama Ibu': reg.nama_ibu,
      'Pekerjaan Ayah': reg.pekerjaan_ayah,
      'Pekerjaan Ibu': reg.pekerjaan_ibu,
      'No Telepon Ortu': reg.no_telepon_ortu,
      'Email Ortu': reg.email_ortu,
      'Program Pilihan': reg.program_pilihan,
      'Motivasi': reg.motivasi,
      'Status': reg.status === 'pending' ? 'Menunggu' : 
               reg.status === 'approved' ? 'Diterima' : 
               reg.status === 'rejected' ? 'Ditolak' : reg.status,
      'Tanggal Daftar': new Date(reg.created_at).toLocaleDateString('id-ID')
    }));

    if (format === 'csv') {
      // CSV Export
      const csv = require('csv-stringify');
      const filename = `registrasi_siswa_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      csv.stringify(exportData, { header: true }, (err, output) => {
        if (err) {
          console.error('CSV generation error:', err);
          return res.status(500).send('Error generating CSV');
        }
        res.send(output);
      });
    } else if (format === 'excel') {
      // Excel Export
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registrasi Siswa');
      
      // Add headers
      const headers = Object.keys(exportData[0] || {});
      worksheet.addRow(headers);
      
      // Add data
      exportData.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
      
      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      const filename = `registrasi_siswa_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      // PDF Export
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      
      const filename = `registrasi_siswa_${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      
      // Title
      doc.fontSize(16).text('Data Registrasi Siswa SMP Baitul Jannah', { align: 'center' });
      doc.moveDown();
      
      // Table headers
      const tableHeaders = ['No', 'Nama', 'Program', 'Status', 'Tanggal'];
      let y = doc.y;
      
      tableHeaders.forEach((header, i) => {
        doc.fontSize(10).text(header, 50 + (i * 100), y, { width: 90 });
      });
      
      doc.moveDown();
      
      // Table data
      exportData.forEach((row, index) => {
        if (doc.y > 700) {
          doc.addPage();
        }
        
        const rowData = [
          row['No'],
          row['Nama Lengkap'].substring(0, 15),
          row['Program Pilihan'].substring(0, 10),
          row['Status'],
          row['Tanggal Daftar']
        ];
        
        y = doc.y;
        rowData.forEach((data, i) => {
          doc.fontSize(8).text(data.toString(), 50 + (i * 100), y, { width: 90 });
        });
        
        doc.moveDown(0.5);
      });
      
      doc.end();
    } else {
      res.status(400).send('Invalid format');
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Export failed');
  }
});

// Get registration details (AJAX)
app.get('/admin/registrations/:id', requireAdminAuth, async (req, res) => {
  const registrationId = req.params.id;
  
  try {
    const registration = await dbHelpers.getStudentRegistrationById(registrationId);
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json(registration);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Get registration details for modal (HTML)
app.get('/admin/registrations/:id/details', requireAdminAuth, async (req, res) => {
  const registrationId = req.params.id;
  
  try {
    const registration = await dbHelpers.getStudentRegistrationById(registrationId);
    
    if (!registration) {
      return res.status(404).send('Registration not found');
    }
    
    res.render('partials/registration-detail', { registration });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});



// Update registration status (AJAX)
app.post('/admin/registrations/:id/status', requireAdminAuth, async (req, res) => {
  const registrationId = req.params.id;
  const { status } = req.body;
  
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    await dbHelpers.updateStudentRegistrationStatus(registrationId, status);
    res.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Admin settings page
app.get('/admin/settings', requireAdminAuth, async (req, res) => {
  try {
    // Get admin user data
    const adminUser = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    
    res.render('admin-settings', {
      title: 'Pengaturan Admin - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      adminUser: adminUser || { full_name: 'Administrator' }
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});

// Admin news management page
app.get('/admin/news', requireAdminAuth, async (req, res) => {
  try {
    // Get admin user data
    const adminUser = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    
    res.render('admin-news', {
      title: 'Manajemen Berita - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      adminUser: adminUser || { full_name: 'Administrator' }
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});

// Admin Testimonials Page
app.get('/admin/testimonials', requireAdminAuth, async (req, res) => {
  try {
    const adminUser = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    const testimonials = await dbHelpers.getAllTestimonials();
    
    res.render('admin-testimonials', {
      title: 'Kelola Testimoni - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      adminUser: adminUser || { full_name: 'Administrator' },
      testimonials: testimonials
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});

// Admin Sliders Page
app.get('/admin/sliders', requireAdminAuth, async (req, res) => {
  try {
    const adminUser = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    const sliders = await dbHelpers.getAllSliders();
    
    res.render('admin-sliders', {
      title: 'Kelola Slider Banner - SMPIT Baituljannah',
      adminName: req.session.adminUsername,
      adminUser: adminUser || { full_name: 'Administrator' },
      sliders: sliders
    });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).send('Database error');
  }
});

// Admin API endpoints for settings
app.get('/admin/api/stats', requireAdminAuth, (req, res) => {
  // Mock data for now - can be replaced with actual database queries
  const stats = {
    totalAdmins: 3,
    dbSize: 15.2,
    lastBackup: '2024-01-15 10:30:00',
    systemStatus: 'Online'
  };
  res.json(stats);
});

app.get('/admin/api/admins', requireAdminAuth, async (req, res) => {
  try {
    const admins = await dbHelpers.getAllAdmins();
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data admin' });
  }
});

app.get('/admin/api/logs', requireAdminAuth, async (req, res) => {
  try {
    const { filter, date } = req.query;
    const filters = {};
    
    if (filter && filter !== 'all') {
      filters.action = filter;
    }
    
    if (date) {
      filters.date = date;
    }
    
    const logs = await dbHelpers.getActivityLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil log aktivitas' });
  }
});

app.get('/admin/api/database-info', requireAdminAuth, (req, res) => {
  // Mock database info - replace with actual database queries
  const dbInfo = {
    size: 15.2,
    tables: 8,
    records: 1250,
    lastBackup: '2024-01-15 10:30:00'
  };
  res.json(dbInfo);
});

app.post('/admin/api/admins', requireAdminAuth, async (req, res) => {
  const { username, full_name, email, password, role } = req.body;
  
  try {
    // Basic validation
    if (!username || !full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    // Check if username already exists
    const existingUsername = await dbHelpers.findAdminByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    // Check if email already exists
    const existingEmail = await dbHelpers.findAdminByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email sudah digunakan' });
    }

    // Create new admin
    const newAdmin = await dbHelpers.createAdmin({
      username,
      full_name,
      email,
      password,
      role
    });

    // Log admin creation activity
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (currentAdmin) {
      await dbHelpers.logActivity(
        currentAdmin.id,
        'Tambah Admin',
        `Admin baru ditambahkan: ${username} (${full_name})`,
        req.ip,
        req.get('User-Agent')
      );
    }

    res.json({ 
      success: true, 
      message: 'Admin berhasil ditambahkan', 
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan admin' });
  }
});

app.post('/admin/api/system-config', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual database update
  res.json({ success: true, message: 'Konfigurasi sistem berhasil disimpan' });
});

app.post('/admin/api/email-config', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual configuration save
  res.json({ success: true, message: 'Pengaturan email berhasil disimpan' });
});

app.post('/admin/api/backup-database', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual backup functionality
  res.json({ success: true, message: 'Backup database berhasil dibuat' });
});

app.post('/admin/api/restore-database', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual restore functionality
  res.json({ success: true, message: 'Database berhasil di-restore' });
});

app.post('/admin/api/optimize-database', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual optimization
  res.json({ success: true, message: 'Database berhasil dioptimasi' });
});

app.post('/admin/api/cleanup-logs', requireAdminAuth, async (req, res) => {
  try {
    await dbHelpers.cleanupOldLogs(30); // Hapus log lebih dari 30 hari
    
    // Log aktivitas cleanup
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (currentAdmin) {
      await dbHelpers.logActivity(
        currentAdmin.id,
        'Cleanup Logs',
        'Log lama berhasil dibersihkan (>30 hari)',
        req.ip,
        req.get('User-Agent')
      );
    }
    
    res.json({ success: true, message: 'Log lama berhasil dibersihkan' });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat membersihkan log' });
  }
});

app.post('/admin/api/reset-database', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual database reset (use with extreme caution)
  res.json({ success: true, message: 'Database berhasil direset' });
});

app.post('/admin/api/test-email', requireAdminAuth, (req, res) => {
  // Mock response - replace with actual email test
  res.json({ success: true, message: 'Email test berhasil dikirim' });
});

app.delete('/admin/api/admins/:id', requireAdminAuth, async (req, res) => {
  const adminId = req.params.id;
  
  try {
    // Prevent deleting the current logged-in admin
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (currentAdmin && currentAdmin.id == adminId) {
      return res.status(400).json({ error: 'Tidak dapat menghapus akun admin yang sedang login' });
    }

    // Check if admin exists
    const adminToDelete = await dbHelpers.findAdminByUsername('');
    // Since we don't have findAdminById, we'll use a different approach
    const allAdmins = await dbHelpers.getAllAdmins();
    const adminExists = allAdmins.find(admin => admin.id == adminId);
    
    if (!adminExists) {
      return res.status(404).json({ error: 'Admin tidak ditemukan' });
    }

    // Delete admin
    await dbHelpers.deleteAdmin(adminId);
    res.json({ success: true, message: 'Admin berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus admin' });
  }
});

app.get('/admin/api/export-logs', requireAdminAuth, (req, res) => {
  // Mock CSV export - replace with actual log export
  const csvData = 'Tanggal,Aksi,Deskripsi\n2024-01-15,Login,Admin login berhasil\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
  res.send(csvData);
});

// News API Routes
// Get all news (with filters)
app.get('/admin/api/news', requireAdminAuth, async (req, res) => {
  try {
    const { status, author, limit, search } = req.query;
    const filters = {};
    
    // Debug logging
    console.log('News API Request - Query params:', req.query);
    console.log('Search parameter:', search);
    
    if (status && status !== 'all') {
      filters.status = status;
    }
    
    if (author && author !== 'all') {
      filters.author_id = author;
    }
    
    if (search && search.trim() !== '') {
      filters.search = search.trim();
      console.log('Search filter applied:', filters.search);
    }
    
    console.log('Final filters:', filters);
    
    const newsLimit = limit ? parseInt(limit) : 50;
    const news = await dbHelpers.getAllNews(filters, newsLimit);
    
    console.log('News results count:', news.length);
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data berita' });
  }
});

// Get news statistics (must be before /:id route)
app.get('/admin/api/news/stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await dbHelpers.getNewsStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching news stats:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil statistik berita' });
  }
});

// Get single news by ID
app.get('/admin/api/news/:id', requireAdminAuth, async (req, res) => {
  try {
    const newsId = req.params.id;
    const news = await dbHelpers.getNewsById(newsId);
    
    if (!news) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data berita' });
  }
});

// Create new news
app.post('/admin/api/news', requireAdminAuth, async (req, res) => {
  try {
    const { title, content, excerpt, featured_image, status } = req.body;
    
    // Debug: Log received data
    console.log('=== CREATE NEWS DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Featured image value:', featured_image);
    console.log('Featured image type:', typeof featured_image);
    console.log('========================');
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi' });
    }
    
    // Get current admin
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (!currentAdmin) {
      return res.status(401).json({ error: 'Admin tidak ditemukan' });
    }
    
    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
    
    const newsData = {
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      featured_image: featured_image || null,
      author_id: currentAdmin.id,
      status: status || 'draft'
    };
    
    const newNews = await dbHelpers.createNews(newsData);
    
    // Log activity
    await dbHelpers.logActivity(
      currentAdmin.id,
      'Tambah Berita',
      `Berita baru ditambahkan: ${title}`,
      req.ip,
      req.get('User-Agent')
    );
    
    res.json({ 
      success: true, 
      message: 'Berita berhasil ditambahkan',
      news: newNews
    });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan berita' });
  }
});

// Update news
app.put('/admin/api/news/:id', requireAdminAuth, async (req, res) => {
  try {
    const newsId = req.params.id;
    const { title, content, excerpt, featured_image, status } = req.body;
    
    // Debug: Log received data
    console.log('=== UPDATE NEWS DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Featured image value:', featured_image);
    console.log('Featured image type:', typeof featured_image);
    console.log('========================');
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi' });
    }
    
    // Check if news exists
    const existingNews = await dbHelpers.getNewsById(newsId);
    if (!existingNews) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }
    
    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
    
    const updateData = {
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      featured_image: featured_image || null,
      status: status || existingNews.status
    };
    
    const updatedNews = await dbHelpers.updateNews(newsId, updateData);
    
    // Log activity
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (currentAdmin) {
      await dbHelpers.logActivity(
        currentAdmin.id,
        'Edit Berita',
        `Berita diperbarui: ${title}`,
        req.ip,
        req.get('User-Agent')
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Berita berhasil diperbarui',
      news: updatedNews
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui berita' });
  }
});

// Delete news
app.delete('/admin/api/news/:id', requireAdminAuth, async (req, res) => {
  try {
    const newsId = req.params.id;
    
    // Check if news exists
    const existingNews = await dbHelpers.getNewsById(newsId);
    if (!existingNews) {
      return res.status(404).json({ error: 'Berita tidak ditemukan' });
    }
    
    await dbHelpers.deleteNews(newsId);
    
    // Log activity
    const currentAdmin = await dbHelpers.findAdminByUsername(req.session.adminUsername);
    if (currentAdmin) {
      await dbHelpers.logActivity(
        currentAdmin.id,
        'Hapus Berita',
        `Berita dihapus: ${existingNews.title}`,
        req.ip,
        req.get('User-Agent')
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Berita berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus berita' });
  }
});



// Upload image for news
app.post('/admin/api/news/upload-image', requireAdminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    }
    
    const originalPath = req.file.path;
    const originalName = path.parse(req.file.filename).name;
    const webpFilename = originalName + '.webp';
    const webpPath = path.join(uploadsDir, webpFilename);
    
    // Convert image to WebP format
    await sharp(originalPath)
      .webp({ quality: 80 }) // 80% quality for good balance between size and quality
      .toFile(webpPath);
    
    // Delete original file after conversion
    fs.unlinkSync(originalPath);
    
    // Return the URL path for the converted WebP image
    const imageUrl = `/uploads/news/${webpFilename}`;
    
    res.json({
      success: true,
      message: 'Gambar berhasil diupload dan dikonversi ke WebP',
      imageUrl: imageUrl,
      filename: webpFilename
    });
  } catch (error) {
    console.error('Error uploading and converting image:', error);
    
    // Clean up files if conversion fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Terjadi kesalahan saat mengupload dan mengkonversi gambar' });
  }
});

// Delete uploaded image
app.delete('/admin/api/news/delete-image/:filename', requireAdminAuth, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Gambar berhasil dihapus' });
    } else {
      res.status(404).json({ error: 'File tidak ditemukan' });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus gambar' });
  }
});

// ===== TESTIMONIALS API ENDPOINTS =====

// Get all testimonials
app.get('/admin/api/testimonials', requireAdminAuth, async (req, res) => {
  try {
    const testimonials = await dbHelpers.getAllTestimonials();
    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data testimoni' });
  }
});

// Get single testimonial
app.get('/admin/api/testimonials/:id', requireAdminAuth, async (req, res) => {
  try {
    const testimonial = await dbHelpers.getTestimonialById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimoni tidak ditemukan' });
    }
    res.json(testimonial);
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data testimoni' });
  }
});

// Create testimonial
app.post('/admin/api/testimonials', requireAdminAuth, async (req, res) => {
  try {
    const { name, role, image, rating, text, content, is_active } = req.body;
    const testimonialContent = text || content;
    
    if (!name || !role || !testimonialContent) {
      return res.status(400).json({ error: 'Nama, peran, dan testimoni harus diisi' });
    }
    
    const testimonialId = await dbHelpers.createTestimonial({
      name,
      role,
      image: image || '/img/testimonials/default.jpg',
      rating: parseInt(rating) || 5,
      content: testimonialContent,
      is_active: is_active !== false
    });
    
    res.json({ success: true, message: 'Testimoni berhasil ditambahkan', id: testimonialId });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan testimoni' });
  }
});

// Update testimonial
app.put('/admin/api/testimonials/:id', requireAdminAuth, async (req, res) => {
  try {
    const { name, role, image, rating, text, content, is_active } = req.body;
    const testimonialContent = text || content;
    
    if (!name || !role || !testimonialContent) {
      return res.status(400).json({ error: 'Nama, peran, dan testimoni harus diisi' });
    }
    
    await dbHelpers.updateTestimonial(req.params.id, {
      name,
      role,
      image: image || '/img/testimonials/default.jpg',
      rating: parseInt(rating) || 5,
      content: testimonialContent,
      is_active: is_active !== false
    });
    
    res.json({ success: true, message: 'Testimoni berhasil diupdate' });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengupdate testimoni' });
  }
});

// Delete testimonial
app.delete('/admin/api/testimonials/:id', requireAdminAuth, async (req, res) => {
  try {
    await dbHelpers.deleteTestimonial(req.params.id);
    res.json({ success: true, message: 'Testimoni berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus testimoni' });
  }
});

// ===== SLIDERS API ENDPOINTS =====

// Get all sliders
app.get('/admin/api/sliders', requireAdminAuth, async (req, res) => {
  try {
    const sliders = await dbHelpers.getAllSliders();
    res.json(sliders);
  } catch (error) {
    console.error('Error fetching sliders:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data slider' });
  }
});

// Get single slider
app.get('/admin/api/sliders/:id', requireAdminAuth, async (req, res) => {
  try {
    const slider = await dbHelpers.getSliderById(req.params.id);
    if (!slider) {
      return res.status(404).json({ error: 'Slider tidak ditemukan' });
    }
    res.json(slider);
  } catch (error) {
    console.error('Error fetching slider:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data slider' });
  }
});

// Create slider
app.post('/admin/api/sliders', requireAdminAuth, async (req, res) => {
  try {
    const { title, subtitle, image, link_url, link_text, is_active, display_order } = req.body;
    
    if (!title || !image) {
      return res.status(400).json({ error: 'Judul dan gambar harus diisi' });
    }
    
    const sliderId = await dbHelpers.createSlider({
      title,
      subtitle: subtitle || null,
      image,
      link_url: link_url || null,
      link_text: link_text || null,
      is_active: is_active !== false,
      display_order: parseInt(display_order) || 0
    });
    
    res.json({ success: true, message: 'Slider berhasil ditambahkan', id: sliderId });
  } catch (error) {
    console.error('Error creating slider:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan slider' });
  }
});

// Update slider
app.put('/admin/api/sliders/:id', requireAdminAuth, async (req, res) => {
  try {
    const { title, subtitle, image, link_url, link_text, is_active, display_order } = req.body;
    
    if (!title || !image) {
      return res.status(400).json({ error: 'Judul dan gambar harus diisi' });
    }
    
    await dbHelpers.updateSlider(req.params.id, {
      title,
      subtitle: subtitle || null,
      image,
      link_url: link_url || null,
      link_text: link_text || null,
      is_active: is_active !== false,
      display_order: parseInt(display_order) || 0
    });
    
    res.json({ success: true, message: 'Slider berhasil diupdate' });
  } catch (error) {
    console.error('Error updating slider:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengupdate slider' });
  }
});

// Delete slider
app.delete('/admin/api/sliders/:id', requireAdminAuth, async (req, res) => {
  try {
    await dbHelpers.deleteSlider(req.params.id);
    res.json({ success: true, message: 'Slider berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting slider:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghapus slider' });
  }
});

// Admin logout
app.get('/admin/logout', requireAdminAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/admin/login');
  });
});

// Test endpoint
app.get('/test-debug', (req, res) => {
  console.log('=== TEST ENDPOINT CALLED ===');
  fs.appendFileSync(path.join(__dirname, 'test-debug.log'), `Test endpoint called at ${new Date().toISOString()}\n`);
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Simple test route
app.get('/simple-route-test', (req, res) => {
  console.log('=== SIMPLE ROUTE TEST CALLED ===');
  res.json({ message: 'Simple route test working', status: 'SUCCESS' });
});

// Debug endpoint for testing news search without authentication
app.get('/debug/news', (req, res) => {
  console.log('=== DEBUG NEWS ENDPOINT CALLED ===');
  const { search, status } = req.query;
  console.log('Query parameters:', { search, status });
  
  res.json({
    success: true,
    message: 'Debug news endpoint working',
    query: req.query,
    path: req.path
  });
});
console.log('DEBUG: /debug/news endpoint registered successfully');

// Debug endpoint with async for database testing
app.get('/debug/news-async', async (req, res) => {
  try {
    console.log('=== DEBUG NEWS ASYNC ENDPOINT CALLED ===');
    const { search, status } = req.query;
    console.log('Query parameters:', { search, status });
    
    const filters = {};
    if (status && status !== 'all') {
      filters.status = status;
    }
    if (search && search.trim()) {
      filters.search = search.trim();
    }
    
    console.log('Filters applied:', filters);
    
    const news = await dbHelpers.getAllNews(filters);
    console.log('News results count:', news.length);
    
    res.json({
      success: true,
      data: news,
      filters: filters,
      count: news.length
    });
  } catch (error) {
    console.error('Debug news endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Emergency test route (moved here before 404 handler)
app.get('/emergency-test-final', (req, res) => {
  res.json({ message: 'Emergency test working FINAL', status: 'OK', location: 'before-404-handler' });
});

// Berita debug route (moved here before 404 handler)
app.get('/berita-debug-final', (req, res) => {
  res.json({ message: 'Berita debug route working FINAL', path: req.path, location: 'before-404-handler' });
});

// Test getAllNews function directly
app.get('/test-get-all-news', async (req, res) => {
  try {
    console.log('=== TESTING getAllNews FUNCTION ===');
    const news = await dbHelpers.getAllNews({ status: 'published', limit: 20 });
    console.log('getAllNews result:', news);
    res.json({ success: true, news: news, count: news ? news.length : 0 });
  } catch (error) {
    console.error('Error in getAllNews test:', error);
    res.json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('=== 404 HANDLER CALLED ===', req.path, req.method);
  res.status(404).render('404', { title: 'Page Not Found' });
});
console.log('DEBUG: 404 handler registered successfully');

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('=== SERVER STARTED SUCCESSFULLY ===');
  console.log('Middleware should be working now...');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  fs.appendFileSync(path.join(__dirname, 'server_error.log'), `${new Date().toISOString()} - Server error: ${err.message}\n`);
});

module.exports = app;