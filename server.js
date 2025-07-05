// server.js 

// ========================== IMPORTS ==========================
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========================== SETUP ==========================
const app = express();
const allowedOrigins = [
  'https://relaxed-granita-a706d2.netlify.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// ========================== MONGODB ==========================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foundit-riphah', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => console.log('✅ Connected to MongoDB'));
mongoose.connection.on('error', (err) => console.log('❌ MongoDB error:', err));

// ========================== STORAGE CONFIG ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    return valid ? cb(null, true) : cb('Only images allowed');
  }
});

// ========================== MODELS ==========================
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  notifications: [{ message: String, date: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
  name: String,
  item: String,
  desc: String,
  imageUrl: String,
  status: { type: String, enum: ['lost', 'found', 'claimed'], default: 'lost' },
  contact: String,
  location: String,
  date: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const Post = mongoose.model('Post', postSchema);

const claimSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  claimedAt: { type: Date, default: Date.now }
});
const Claim = mongoose.model('Claim', claimSchema);

const adminSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// ========================== AUTH MIDDLEWARE ==========================
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ========================== ROUTES ==========================
app.get('/', (req, res) => {
  res.send('🎉 FoundIt Backend is Running!');
});
// --- Signup Route ---
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const isAdmin = email.endsWith('@admin.riphah.edu.pk');
    const hashedPassword = await bcrypt.hash(password, 10);
    let baseUsername = email.split('@')[0];
    let username = baseUsername;
    let counter = 1;

    if (isAdmin) {
      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });
      const admin = await new Admin({ email, username, password: hashedPassword }).save();
      const token = jwt.sign({ adminId: admin._id, role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
      return res.status(201).json({ message: 'Admin created', token, user: { id: admin._id, email: admin.email, username: admin.username, role: 'admin' }});
    }

    if (!email || !password || (!email.endsWith('@students.riphah.edu.pk') && !email.endsWith('@faculty.riphah.edu.pk')) || password.length < 6) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter++}`;
    }

    const newUser = await new User({ email, username, password: hashedPassword }).save();
    const token = jwt.sign({ userId: newUser._id, email: newUser.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.status(201).json({ message: 'User created', token, user: { id: newUser._id, email: newUser.email, username: newUser.username, role: 'user' } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
});      

// --- Login Route ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const admin = await Admin.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id, email: user.email, username: user.username, role: 'user' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
      return res.json({ message: 'Login successful', token, user: { id: user._id, email: user.email, username: user.username, role: 'user' } });
    }

    if (admin && await bcrypt.compare(password, admin.password)) {
      const token = jwt.sign({ adminId: admin._id, email: admin.email, username: admin.username, role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
      return res.json({ message: 'Admin login successful', token, user: { id: admin._id, email: admin.email, username: admin.username, role: 'admin' } });
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- All Posts CRUD ---
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 }).populate('userId', 'email username');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts', authenticateToken, upload.single('image'), async (req, res) => {
  try {
          const { name, item, desc, status, contact, location } = req.body;

      if (!name || !item || !desc) {
        return res.status(400).json({ message: 'Name, item, and description are required' });
      }

      // Require contact if status is lost
      if (status === 'lost' && !contact) {
        return res.status(400).json({ message: 'Contact is required for lost items' });
}
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !item || !desc) {
      return res.status(400).json({ message: 'Name, item, and description are required' });
    }

    const post = new Post({ name, item, desc, status: status || 'lost', contact: status === 'lost' ? contact : '', location, imageUrl, userId: req.user.userId });
    const newPost = await post.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('userId', 'username email');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching post' });
  }
});
// --- Fetch All Claims for Admin ---
  app.get('/api/claims', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    try {
      const claims = await Claim.find()
        .populate({ path: 'postId', populate: { path: 'userId', select: 'username' } })
        .populate('claimantId', 'username');
      res.json(claims);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch claims' });
    }
  });

// --- Claim Creation Route ---
app.post('/api/posts/:id/claim', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const claimantId = req.user.userId;
    const exists = await Claim.findOne({ postId, claimantId });
    if (exists) return res.status(400).json({ message: 'Already claimed' });

    const claim = await new Claim({ postId, claimantId }).save();
    res.status(201).json({ message: 'Claim submitted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error submitting claim' });
  }
});


// --- Approve Claim + Notify User ---
app.post('/api/claims/:id/approve', authenticateToken, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('postId');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    claim.status = 'approved';
    await claim.save();

    claim.postId.status = 'claimed';
    await claim.postId.save();

    const claimant = await User.findById(claim.claimantId);
    claimant.notifications.push({
      message: `Your claim for "${claim.postId.item}" has been approved!`,
      date: new Date()
    });
    await claimant.save();

    res.status(200).json({ message: 'Claim approved' });
  } catch (e) {
    console.error('❌ Approve Error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Deny Claim ---
app.post('/api/claims/:id/deny', authenticateToken, async (req, res) => {
  try {
    const claim = await Claim.findByIdAndUpdate(req.params.id, { status: 'denied' }, { new: true }).populate('postId');
    const user = await User.findById(claim.claimantId);
    user.notifications.push({ message: `Your claim for "${claim.postId.item}" was denied.` });
    await user.save();

    res.json({ message: 'Claim denied' });
  } catch (e) {
    console.error('❌ Deny Error:', e);
    res.status(500).json({ message: 'Failed to deny claim' });
  }
});

app.get('/api/claims/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

  try {
    const totalPosts = await Post.countDocuments();
    const pendingClaims = await Claim.countDocuments({ status: 'pending' });
    const resolvedClaims = await Claim.countDocuments({ status: { $in: ['approved', 'denied'] } });

    res.json({ totalPosts, pendingClaims, resolvedClaims });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});


// --- Clear Notifications ---
app.post('/api/notifications/clear', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { notifications: [] });
    res.json({ message: 'Notifications cleared' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to clear notifications' });
  }
});

// --- Profile Info (user stats + notifications) ---
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    res.json({ username: user.username, createdAt: user.createdAt, notifications: user.notifications || [] });
  } catch (e) {
    res.status(500).json({ message: 'Profile fetch error' });
  }
});

app.get('/api/profile/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user.userId }).sort({ date: -1 });
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: 'Post fetch error' });
  }
});

// ========================== START SERVER ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
