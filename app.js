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

// Load school content data
const schoolContentPath = path.join(__dirname, 'data', 'school-content.json');
const schoolContent = JSON.parse(fs.readFileSync(schoolContentPath, 'utf8'));
const app = express();
const PORT = process.env.PORT || 80;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
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

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Simple in-memory user database (replace with real database in production)
const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  }
];

// Helper function to find user by email
const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

// Helper function to create new user
const createUser = (name, email, hashedPassword) => {
  const newUser = {
    id: users.length + 1,
    name,
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
    text: 'SMPTI Baituljannah telah mengubah pengalaman belajar saya. Program-programnya terstruktur dengan baik dan para pengajar sangat berkualitas.'
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
app.get('/', (req, res) => {
  console.log('=== SMP HOME ROUTE CALLED ===');
  console.log('Request received at:', new Date().toISOString());
  console.log('School content title:', schoolContent.beranda.welcome_message);
  res.render('home', {
    title: 'SMPTI Baituljannah - Sekolah Teknologi Informasi',
    categories: categoriesData,
    courses: coursesData,
    testimonials: testimonialsData,
    schoolContent: schoolContent
  });
  console.log('=== RESPONSE SENT ===');
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
  body('email').isEmail().withMessage('Please enter a valid email'),
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
  
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.render('login', {
      title: 'Login - Baituljannah',
      errors: ['Invalid email or password'],
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
  res.render('signup', { title: 'Daftar Akun - SMPTI Baituljannah' });
});

app.post('/signup', [
  body('name').notEmpty().withMessage('Name is required'),
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
  
  const { name, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = findUserByEmail(email);
  if (existingUser) {
    return res.render('signup', {
      title: 'Daftar - Baituljannah',
      errors: ['User with this email already exists'],
      formData: req.body
    });
  }
  
  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = createUser(name, email, hashedPassword);
  
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
  res.render('konsultasi', { title: 'Konsultasi - SMPTI Baituljannah' });
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
      title: 'Konsultasi - SMPTI Baituljannah',
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
    title: 'Konsultasi - SMPTI Baituljannah',
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
  res.render('portal-siswa', { title: 'Portal Siswa - SMPTI Baituljannah' });
});

// Student registration routes
app.get('/daftar-siswa', (req, res) => {
  res.render('daftar-siswa', { title: 'Pendaftaran Siswa Baru - SMPTI Baituljannah' });
});

app.post('/daftar-siswa', [
  body('namaLengkap').notEmpty().withMessage('Nama lengkap wajib diisi'),
  body('tempatLahir').notEmpty().withMessage('Tempat lahir wajib diisi'),
  body('tanggalLahir').notEmpty().withMessage('Tanggal lahir wajib diisi'),
  body('jenisKelamin').notEmpty().withMessage('Jenis kelamin wajib dipilih'),
  body('agama').notEmpty().withMessage('Agama wajib dipilih'),
  body('alamat').notEmpty().withMessage('Alamat wajib diisi'),
  body('asalSekolah').notEmpty().withMessage('Nama sekolah asal wajib diisi'),
  body('alamatSekolah').notEmpty().withMessage('Alamat sekolah asal wajib diisi'),
  body('tahunLulus').isInt({ min: 2020, max: 2024 }).withMessage('Tahun lulus tidak valid'),
  body('namaAyah').notEmpty().withMessage('Nama ayah wajib diisi'),
  body('namaIbu').notEmpty().withMessage('Nama ibu wajib diisi'),
  body('pekerjaanAyah').notEmpty().withMessage('Pekerjaan ayah wajib diisi'),
  body('pekerjaanIbu').notEmpty().withMessage('Pekerjaan ibu wajib diisi'),
  body('noTeleponOrtu').notEmpty().withMessage('No. telepon orang tua wajib diisi'),
  body('programPilihan').notEmpty().withMessage('Program pilihan wajib dipilih')
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.render('daftar-siswa', {
      title: 'Pendaftaran Siswa Baru - SMPTI Baituljannah',
      errors: errors.array().map(err => err.msg),
      formData: req.body
    });
  }
  
  // Here you would typically save the student registration data to a database
  // For now, we'll just show a success message
  console.log('Student registration data:', req.body);
  
  res.render('daftar-siswa', {
    title: 'Pendaftaran Siswa Baru - SMPTI Baituljannah',
    success: true,
    formData: {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

module.exports = app;