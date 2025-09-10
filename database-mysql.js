const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL connection configuration for XAMPP
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Default XAMPP MySQL password is empty
  database: 'smp_baituljannah',
  port: 3306,
  charset: 'utf8mb4'
};

// Database availability flag
let isDatabaseAvailable = false;

// Safe database operation wrapper
const safeDbOperation = async (operation, fallbackData = null) => {
  if (!isDatabaseAvailable) {
    console.warn('Database not available, returning fallback data');
    return fallbackData;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error.message);
    return fallbackData;
  }
};

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database and tables
async function initializeDatabase() {
  try {
    // Create database if not exists
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();
    
    // Create tables
    await createTables();
    await insertDefaultAdmin();
    
    isDatabaseAvailable = true;
    console.log('MySQL database initialized successfully');
  } catch (error) {
    isDatabaseAvailable = false;
    console.error('Error initializing MySQL database:', error);
    throw error;
  }
}

// Create database tables
async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    // Admin users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'super_admin') DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Student registrations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS student_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_lengkap VARCHAR(100) NOT NULL,
        tempat_lahir VARCHAR(50) NOT NULL,
        tanggal_lahir DATE NOT NULL,
        jenis_kelamin ENUM('Laki-laki', 'Perempuan') NOT NULL,
        agama VARCHAR(20) NOT NULL,
        alamat TEXT NOT NULL,
        no_telepon VARCHAR(20),
        email VARCHAR(100),
        asal_sekolah VARCHAR(100) NOT NULL,
        alamat_sekolah TEXT NOT NULL,
        tahun_lulus YEAR NOT NULL,
        nama_ayah VARCHAR(100) NOT NULL,
        nama_ibu VARCHAR(100) NOT NULL,
        pekerjaan_ayah VARCHAR(50) NOT NULL,
        pekerjaan_ibu VARCHAR(50) NOT NULL,
        no_telepon_ortu VARCHAR(20) NOT NULL,
        email_ortu VARCHAR(100),
        program_pilihan VARCHAR(50) NOT NULL,
        motivasi TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_program (program_pilihan),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Activity logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT,
        action VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // News table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        featured_image VARCHAR(255),
        category VARCHAR(100) DEFAULT 'Umum',
        author_id INT,
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
        published_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_status (status),
        INDEX idx_category (category),
        INDEX idx_published_at (published_at),
        INDEX idx_author_id (author_id),
        FOREIGN KEY (author_id) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add category column if it doesn't exist (for existing databases)
    await connection.execute(`
      ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Umum' AFTER featured_image
    `);
    
    await connection.execute(`
      ALTER TABLE news ADD INDEX IF NOT EXISTS idx_category (category)
    `);
    
    // Testimonials table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        image VARCHAR(255),
        rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Sliders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sliders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle TEXT,
        image VARCHAR(255) NOT NULL,
        link_url VARCHAR(255),
        link_text VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Insert default testimonials if table is empty
    const [testimonialRows] = await connection.execute('SELECT COUNT(*) as count FROM testimonials');
    if (testimonialRows[0].count === 0) {
      await connection.execute(`
        INSERT INTO testimonials (name, role, content, rating, display_order) VALUES
        ('Ahmad Fauzi', 'Alumni 2023', 'SMPIT Baituljannah telah memberikan pendidikan yang sangat berkualitas. Saya merasa siap menghadapi tantangan di jenjang selanjutnya.', 5, 1),
        ('Siti Nurhaliza', 'Alumni 2022', 'Lingkungan belajar yang Islami dan modern membuat saya nyaman belajar. Guru-guru sangat perhatian dan profesional.', 5, 2),
        ('Muhammad Rizki', 'Alumni 2023', 'Program unggulan di SMPIT Baituljannah sangat membantu mengembangkan potensi diri. Terima kasih untuk semua ilmu yang diberikan.', 5, 3)
      `);
    }
    
    // Insert default sliders if table is empty
    const [sliderRows] = await connection.execute('SELECT COUNT(*) as count FROM sliders');
    if (sliderRows[0].count === 0) {
      await connection.execute(`
        INSERT INTO sliders (title, subtitle, image, display_order) VALUES
        ('Selamat Datang di SMPIT Baituljannah', 'Membentuk Generasi Qurani yang Unggul dan Berakhlak Mulia', '/img/slider/DSC09013.webp', 1),
        ('Pendidikan Berkualitas', 'Dengan Kurikulum Terintegrasi dan Fasilitas Modern', '/img/slider/DSC09327.webp', 2),
        ('Lingkungan Islami', 'Menciptakan Suasana Belajar yang Kondusif dan Religius', '/img/slider/PKLN2292 (2).webp', 3)
      `);
    }
    
  } finally {
    connection.release();
  }
}

// Insert default admin user
async function insertDefaultAdmin() {
  const connection = await pool.getConnection();
  
  try {
    // Check if admin already exists
    const [rows] = await connection.execute(
      'SELECT id FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (rows.length === 0) {
      const defaultPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'INSERT INTO admin_users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@smpbaituljannah.sch.id', defaultPassword, 'Administrator', 'super_admin']
      );
      console.log('Default admin user created');
    }
  } finally {
    connection.release();
  }
}

// Database helper functions
const dbHelpers = {
  // Admin functions
  findAdminByUsername: async (username) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM admin_users WHERE username = ?',
        [username]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  findAdminByEmail: async (email) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM admin_users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  createAdmin: async (userData) => {
    const { username, email, password, full_name, role = 'admin' } = userData;
    const connection = await pool.getConnection();
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [result] = await connection.execute(
        'INSERT INTO admin_users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, full_name, role]
      );
      
      return { id: result.insertId, username, email, full_name, role };
    } finally {
      connection.release();
    }
  },

  getAllAdmins: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, username, email, full_name, role, created_at FROM admin_users ORDER BY created_at DESC'
      );
      return rows;
    } finally {
      connection.release();
    }
  },

  updateAdmin: async (id, userData) => {
    const { username, email, full_name, role, password } = userData;
    const connection = await pool.getConnection();
    
    try {
      let query = 'UPDATE admin_users SET username = ?, email = ?, full_name = ?, role = ?';
      let params = [username, email, full_name, role];
      
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += ', password = ?';
        params.push(hashedPassword);
      }
      
      query += ' WHERE id = ?';
      params.push(id);
      
      await connection.execute(query, params);
      return true;
    } finally {
      connection.release();
    }
  },

  deleteAdmin: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM admin_users WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  },

  authenticateAdmin: async (username, password) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM admin_users WHERE username = ?',
        [username]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const admin = rows[0];
      const isMatch = await bcrypt.compare(password, admin.password);
      
      if (isMatch) {
        return admin;
      }
      
      return null;
    } finally {
      connection.release();
    }
  },

  // Student registration functions
  createStudentRegistration: async (studentData) => {
    const {
      namaLengkap, tempatLahir, tanggalLahir, jenisKelamin, agama, alamat,
      noTelepon, email, asalSekolah, alamatSekolah, tahunLulus,
      namaAyah, namaIbu, pekerjaanAyah, pekerjaanIbu, noTeleponOrtu, emailOrtu,
      programPilihan, motivasi
    } = studentData;

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO student_registrations (
          nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, alamat,
          no_telepon, email, asal_sekolah, alamat_sekolah, tahun_lulus,
          nama_ayah, nama_ibu, pekerjaan_ayah, pekerjaan_ibu, no_telepon_ortu, email_ortu,
          program_pilihan, motivasi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          namaLengkap, tempatLahir, tanggalLahir, jenisKelamin, agama, alamat,
          noTelepon, email, asalSekolah, alamatSekolah, tahunLulus,
          namaAyah, namaIbu, pekerjaanAyah, pekerjaanIbu, noTeleponOrtu, emailOrtu,
          programPilihan, motivasi
        ]
      );
      return { id: result.insertId };
    } finally {
      connection.release();
    }
  },

  getAllStudentRegistrations: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM student_registrations ORDER BY created_at DESC'
      );
      return rows;
    } finally {
      connection.release();
    }
  },

  getStudentRegistrationById: async (id) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM student_registrations WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  updateStudentRegistrationStatus: async (id, status) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE student_registrations SET status = ? WHERE id = ?',
        [status, id]
      );
      return true;
    } finally {
      connection.release();
    }
  },

  deleteStudentRegistration: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM student_registrations WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  },

  getRegistrationStats: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today
        FROM student_registrations
      `);
      return rows[0];
    } finally {
      connection.release();
    }
  },

  getRecentRegistrations: async (limit) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM student_registrations ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return rows;
    } finally {
      connection.release();
    }
  },

  getStudentRegistrations: async (filters) => {
    const connection = await pool.getConnection();
    try {
      let query = 'SELECT * FROM student_registrations WHERE 1=1';
      const params = [];
      
      if (filters.status && filters.status !== '') {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.program && filters.program !== '') {
        query += ' AND program_pilihan = ?';
        params.push(filters.program);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  },

  // Activity logging functions
  logActivity: async (adminId, action, description, ipAddress = null, userAgent = null) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT INTO activity_logs (admin_id, action, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [adminId, action, description, ipAddress, userAgent]
      );
    } finally {
      connection.release();
    }
  },

  getActivityLogs: async (filters = {}) => {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT al.*, au.username, au.full_name 
        FROM activity_logs al 
        LEFT JOIN admin_users au ON al.admin_id = au.id 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.action && filters.action !== 'all') {
        query += ' AND al.action LIKE ?';
        params.push(`%${filters.action}%`);
      }
      
      if (filters.date) {
        query += ' AND DATE(al.created_at) = ?';
        params.push(filters.date);
      }
      
      if (filters.adminId) {
        query += ' AND al.admin_id = ?';
        params.push(filters.adminId);
      }
      
      query += ' ORDER BY al.created_at DESC LIMIT 100';
      
      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  },

  cleanupOldLogs: async (daysToKeep = 30) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysToKeep]
      );
    } finally {
      connection.release();
    }
  },

  // News functions
  createNews: async (newsData) => {
    const { title, slug, content, excerpt, featured_image, category = 'Umum', author_id, status = 'draft' } = newsData;
    const connection = await pool.getConnection();
    
    try {
      const published_at = status === 'published' ? new Date() : null;
      
      const [result] = await connection.execute(
        'INSERT INTO news (title, slug, content, excerpt, featured_image, category, author_id, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [title, slug, content, excerpt, featured_image, category, author_id, status, published_at]
      );
      
      return { id: result.insertId, ...newsData };
    } finally {
      connection.release();
    }
  },

  getAllNews: async (filters = {}) => {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT n.*, au.username as author_name, au.full_name as author_full_name 
        FROM news n 
        LEFT JOIN admin_users au ON n.author_id = au.id 
        WHERE 1=1
      `;
      const params = [];
      
      console.log('getAllNews called with filters:', filters);
      
      if (filters.status && filters.status !== 'all') {
        query += ' AND n.status = ?';
        params.push(filters.status);
      }
      
      if (filters.author_id) {
        query += ' AND n.author_id = ?';
        params.push(filters.author_id);
      }
      
      if (filters.search) {
        query += ' AND (n.title LIKE ? OR n.content LIKE ? OR n.excerpt LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        console.log('Search query added with term:', searchTerm);
      }
      
      query += ' ORDER BY n.created_at DESC';
      
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }
      
      console.log('Final SQL query:', query);
      console.log('Query parameters:', params);
      
      const [rows] = await connection.execute(query, params);
      console.log('Query returned rows:', rows.length);
      return rows;
    } finally {
      connection.release();
    }
  },

  getNewsCount: async (filters = {}) => {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM news n 
        WHERE 1=1
      `;
      const params = [];
      
      if (filters.status && filters.status !== 'all') {
        query += ' AND n.status = ?';
        params.push(filters.status);
      }
      
      if (filters.author_id) {
        query += ' AND n.author_id = ?';
        params.push(filters.author_id);
      }
      
      if (filters.search) {
        query += ' AND (n.title LIKE ? OR n.content LIKE ? OR n.excerpt LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      const [rows] = await connection.execute(query, params);
      return rows[0].total;
    } finally {
      connection.release();
    }
  },

  getPublishedNews: async (limit = null) => {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT n.*, au.username as author_name, au.full_name as author_full_name 
        FROM news n 
        LEFT JOIN admin_users au ON n.author_id = au.id 
        WHERE n.status = 'published' AND n.published_at <= NOW()
        ORDER BY n.published_at DESC
      `;
      
      if (limit) {
        query += ' LIMIT ?';
        const [rows] = await connection.execute(query, [parseInt(limit)]);
        return rows;
      } else {
        const [rows] = await connection.execute(query);
        return rows;
      }
    } finally {
      connection.release();
    }
  },

  getNewsById: async (id) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT n.*, au.username as author_name, au.full_name as author_full_name FROM news n LEFT JOIN admin_users au ON n.author_id = au.id WHERE n.id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  getNewsBySlug: async (slug) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT n.*, au.username as author_name, au.full_name as author_full_name FROM news n LEFT JOIN admin_users au ON n.author_id = au.id WHERE n.slug = ? AND n.status = "published"',
        [slug]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  updateNews: async (id, newsData) => {
    const { title, slug, content, excerpt, featured_image, category, status } = newsData;
    const connection = await pool.getConnection();
    
    try {
      let query = 'UPDATE news SET title = ?, slug = ?, content = ?, excerpt = ?, featured_image = ?, category = ?, status = ?';
      let params = [title, slug, content, excerpt, featured_image, category, status];
      
      // Update published_at if status changes to published
      if (status === 'published') {
        query += ', published_at = CASE WHEN published_at IS NULL THEN NOW() ELSE published_at END';
      }
      
      query += ' WHERE id = ?';
      params.push(id);
      
      await connection.execute(query, params);
      return true;
    } finally {
      connection.release();
    }
  },

  deleteNews: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM news WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  },

  getNewsStats: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today
        FROM news
      `);
      return rows[0];
    } finally {
      connection.release();
    }
  },

  // Testimonials functions
  getAllTestimonials: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM testimonials ORDER BY display_order ASC, created_at DESC'
      );
      return rows;
    } finally {
      connection.release();
    }
  },

  getActiveTestimonials: async () => {
    const fallbackData = [
      {
        id: 1,
        name: 'Ahmad Fauzi',
        role: 'Alumni 2023',
        content: 'SMP Baitul Jannah memberikan pendidikan yang sangat baik dengan nilai-nilai Islam yang kuat.',
        rating: 5,
        image: null,
        is_active: true
      },
      {
        id: 2,
        name: 'Siti Nurhaliza',
        role: 'Orang Tua Siswa',
        content: 'Anak saya berkembang dengan baik di SMP Baitul Jannah. Guru-gurunya sangat perhatian.',
        rating: 5,
        image: null,
        is_active: true
      }
    ];
    
    return await safeDbOperation(async () => {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM testimonials WHERE is_active = TRUE ORDER BY display_order ASC, created_at DESC'
        );
        return rows;
      } finally {
        connection.release();
      }
    }, fallbackData);
  },

  getTestimonialById: async (id) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM testimonials WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  createTestimonial: async (testimonialData) => {
    const connection = await pool.getConnection();
    try {
      const { name, role, content, image, rating, is_active, display_order } = testimonialData;
      const [result] = await connection.execute(
        'INSERT INTO testimonials (name, role, content, image, rating, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, role, content, image || null, rating || 5, is_active !== false, display_order || 0]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  },

  updateTestimonial: async (id, testimonialData) => {
    const connection = await pool.getConnection();
    try {
      const { name, role, content, image, rating, is_active, display_order } = testimonialData;
      await connection.execute(
        'UPDATE testimonials SET name = ?, role = ?, content = ?, image = ?, rating = ?, is_active = ?, display_order = ? WHERE id = ?',
        [name, role, content, image, rating, is_active, display_order, id]
      );
      return true;
    } finally {
      connection.release();
    }
  },

  deleteTestimonial: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM testimonials WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  },

  // Sliders functions
  getAllSliders: async () => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM sliders ORDER BY display_order ASC, created_at DESC'
      );
      return rows;
    } finally {
      connection.release();
    }
  },

  getActiveSliders: async () => {
    const fallbackData = [
      {
        id: 1,
        title: 'Selamat Datang di SMP Baitul Jannah',
        subtitle: 'Pendidikan Berkualitas dengan Nilai-nilai Islam',
        description: 'Membentuk generasi yang berakhlak mulia dan berprestasi',
        image: '/img/slider/slide-1.jpg',
        link_url: '/daftar-siswa',
        link_text: 'Daftar Sekarang',
        is_active: true,
        display_order: 1
      },
      {
        id: 2,
        title: 'Fasilitas Lengkap dan Modern',
        subtitle: 'Mendukung Proses Pembelajaran Optimal',
        description: 'Laboratorium, perpustakaan, dan fasilitas olahraga terbaik',
        image: '/img/slider/slide-2.jpg',
        link_url: '/fasilitas',
        link_text: 'Lihat Fasilitas',
        is_active: true,
        display_order: 2
      }
    ];
    
    return await safeDbOperation(async () => {
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(
          'SELECT * FROM sliders WHERE is_active = TRUE ORDER BY display_order ASC, created_at DESC'
        );
        return rows;
      } finally {
        connection.release();
      }
    }, fallbackData);
  },

  getSliderById: async (id) => {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM sliders WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  },

  createSlider: async (sliderData) => {
    const connection = await pool.getConnection();
    try {
      const { title, subtitle, image, link_url, link_text, is_active, display_order } = sliderData;
      const [result] = await connection.execute(
        'INSERT INTO sliders (title, subtitle, image, link_url, link_text, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, subtitle || null, image, link_url || null, link_text || null, is_active !== false, display_order || 0]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  },

  updateSlider: async (id, sliderData) => {
    const connection = await pool.getConnection();
    try {
      const { title, subtitle, image, link_url, link_text, is_active, display_order } = sliderData;
      await connection.execute(
        'UPDATE sliders SET title = ?, subtitle = ?, image = ?, link_url = ?, link_text = ?, is_active = ?, display_order = ? WHERE id = ?',
        [title, subtitle, image, link_url, link_text, is_active, display_order, id]
      );
      return true;
    } finally {
      connection.release();
    }
  },

  deleteSlider: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM sliders WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
};

// Initialize database on module load (non-blocking)
initializeDatabase().catch(err => {
  console.warn('Database initialization failed, running without database:', err.message);
});

module.exports = { pool, dbHelpers };