const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:4200' }));
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDFs, JPEG, PNG, and JPG are allowed.'));
    }
  }
});

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

// Parse JSON requests
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/elearning', {
  dbName: 'elearning'
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Instructor Schema
const instructorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true }
}, { collection: 'Instructor' });
const Instructor = mongoose.model('Instructor', instructorSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  contents: { type: String, required: true },
  pdfs: [{ type: String }],
  youtubeLinks: [{ type: String }],
  instructorId: { type: String, required: true },
  thumbnail: { type: String },
  price: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'courses' });
const Course = mongoose.model('Course', courseSchema);

// Pending Course Schema
const pendingCourseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  contents: { type: String, required: true },
  youtubeLinks: [{ type: String }],
  instructorId: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  pdfs: [{ type: String }],
  thumbnail: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'pendingCourses' });
const PendingCourse = mongoose.model('PendingCourse', pendingCourseSchema);

// Assessment Schema
const assessmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{
    text: { type: String, required: true },
    options: { type: [String], required: true, validate: v => v.length === 4 },
    correctAnswer: { type: Number, required: true, min: 1, max: 4 },
    marks: { type: Number, required: true, min: 1 }
  }],
  timeLimit: { type: Number, required: true, min: 1 },
  instructorId: { type: String, required: true },
  courseId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'assessments' });
const Assessment = mongoose.model('Assessment', assessmentSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  photo: { type: String }
}, { collection: 'users' });
const User = mongoose.model('User', userSchema);

// Submission Schema
const submissionSchema = new mongoose.Schema({
  assessmentId: { type: String, required: true },
  studentId: { type: String, required: true },
  score: { type: Number, required: true },
  answers: [{
    questionIndex: { type: Number, required: true },
    selectedAnswer: { type: Number, required: true }
  }],
  submittedAt: { type: Date, default: Date.now }
}, { collection: 'submissions' });
const Submission = mongoose.model('Submission', submissionSchema);

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  courseId: { type: String, required: true }
}, { collection: 'enrollments' });
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

// Routes

// Test route
app.get('/', (req, res) => {
  res.send('E-Learning Backend is running');
});

// User Registration
app.post('/api/auth/register', upload.single('photo'), async (req, res) => {
  const { name, age, email, password, mobile } = req.body;
  console.log('Registration attempt:', { name, age, email, mobile });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already exists:', email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const newUser = new User({ name, age: parseInt(age), email, password, mobile, photo });
    await newUser.save();

    console.log('User registered successfully:', newUser);
    res.status(201).json({ message: 'User registered successfully', user: { id: newUser._id.toString(), name: newUser.name, email: newUser.email } });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// User Login
app.post('/api/auth/user-login', async (req, res) => {
  const { email, password } = req.body;
  console.log('User login attempt:', { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.password !== password) {
      console.log('Password mismatch:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('Login successful:', user.email);
    res.json({ message: 'Login successful', user: { id: user._id.toString(), name: user.name, email: user.email, photo: user.photo } });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Instructor Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Instructor login attempt:', { username });

  try {
    const instructor = await Instructor.findOne({ username });
    if (!instructor) {
      console.log('Instructor not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (instructor.password !== password) {
      console.log('Password mismatch:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({ message: 'Login successful', instructor: { id: instructor._id.toString(), username: instructor.username } });
  } catch (error) {
    console.error('Error during instructor login:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Instructor Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, newPassword } = req.body;
  console.log('Reset password request:', { username });

  try {
    const instructor = await Instructor.findOne({ username });
    if (!instructor) {
      console.log('Instructor not found:', username);
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const updateResult = await Instructor.updateOne(
      { username },
      { $set: { password: newPassword } }
    );

    if (updateResult.matchedCount === 0) {
      console.log('No instructor matched for update:', username);
      return res.status(404).json({ message: 'Instructor not found' });
    }

    console.log('Password reset successful:', username);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Instructor
app.post('/api/instructors', async (req, res) => {
  try {
    const { id, name, email, mobile, password } = req.body;
    console.log('Received instructor data:', req.body);

    if (!id || !name || !email || !mobile || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingInstructor = await Instructor.findOne({ $or: [{ username: id }, { email }] });
    if (existingInstructor) {
      return res.status(400).json({ message: 'Instructor ID or email already exists' });
    }

    const instructor = new Instructor({
      username: id,
      name,
      email,
      mobile,
      password
    });

    await instructor.save();
    console.log('Instructor saved:', instructor);
    res.status(201).json({ message: 'Instructor created successfully' });
  } catch (error) {
    console.error('Error creating instructor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get All Courses with Enrolled Users
app.get('/api/courses', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not established');
    }

    const courses = await Course.find().sort({ createdAt: -1 });
    console.log('Fetched courses:', courses.length);

    const coursesWithEnrollments = await Promise.all(
      courses.map(async (course) => {
        try {
          const enrollments = await Enrollment.find({ courseId: course._id });
          console.log(`Course ${course._id}: Found ${enrollments.length} enrollments`);

          const enrolledUsers = await Promise.all(
            enrollments.map(async (enrollment) => {
              try {
                if (!mongoose.Types.ObjectId.isValid(enrollment.studentId)) {
                  console.warn(`Invalid studentId in enrollment: ${enrollment.studentId}`);
                  return null;
                }

                const user = await User.findById(enrollment.studentId).select('name email');
                if (!user) {
                  console.warn(`User not found for studentId: ${enrollment.studentId}`);
                  return null;
                }

                return { id: user._id.toString(), name: user.name, email: user.email };
              } catch (userError) {
                console.error(`Error fetching user for enrollment ${enrollment._id}:`, userError);
                return null;
              }
            })
          );

          return {
            ...course.toObject(),
            enrolledUsers: enrolledUsers.filter(user => user !== null)
          };
        } catch (enrollmentError) {
          console.error(`Error processing enrollments for course ${course._id}:`, enrollmentError);
          return { ...course.toObject(), enrolledUsers: [] };
        }
      })
    );

    res.json({ message: 'Courses retrieved successfully', courses: coursesWithEnrollments });
  } catch (error) {
    console.error('Error fetching courses:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Students Enrolled in a Course
app.get('/api/courses/:courseId/students', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    console.log('Fetching students for courseId:', courseId);

    const course = await Course.findById(courseId);
    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrollments = await Enrollment.find({ courseId });
    const studentIds = enrollments.map(enrollment => enrollment.studentId);
    const students = await User.find({ _id: { $in: studentIds } }).select('name email');

    const formattedStudents = students.map(student => ({
      _id: student._id.toString(),
      username: student.name,
      email: student.email
    }));

    console.log('Students found:', formattedStudents);
    res.json({ students: formattedStudents });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Assessments for a Course
app.get('/api/courses/:courseId/assessments', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    console.log('Fetching assessments for courseId:', courseId);

    const assessments = await Assessment.find({ courseId }).sort({ createdAt: -1 });
    res.json({ assessments });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Submissions for an Assessment
app.get('/api/assessments/:assessmentId/submissions', async (req, res) => {
  try {
    const assessmentId = req.params.assessmentId;
    console.log('Fetching submissions for assessmentId:', assessmentId);

    const submissions = await Submission.find({ assessmentId });
    if (!submissions || submissions.length === 0) {
      console.log('No submissions found for assessmentId:', assessmentId);
      return res.status(200).json({ submissions: [] });
    }

    const studentIds = submissions.map(submission => submission.studentId);
    const students = await User.find({ _id: { $in: studentIds } }).select('name');

    const formattedSubmissions = submissions.map(submission => {
      const student = students.find(s => s._id.toString() === submission.studentId);
      return {
        studentId: {
          _id: submission.studentId,
          username: student ? student.name : 'Unknown Student'
        },
        score: submission.score,
        submittedAt: submission.submittedAt
      };
    });

    console.log('Submissions found:', formattedSubmissions);
    res.json({ submissions: formattedSubmissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all assessments of the instructor
app.get('/api/assessments/instructor/:instructorId', async (req, res) => {
  try {
    const instructorId = req.params.instructorId;
    const assessments = await Assessment.find({ instructorId }).sort({ createdAt: -1 });
    res.json({ message: 'Assessments retrieved successfully', assessments });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all assessments of the course
app.get('/api/assessments/course/:courseId', async (req, res) => {
  try {
    const courseId = req.params.courseId;
    console.log('Fetching assessments for courseId:', courseId);

    const assessments = await Assessment.find({ courseId }).sort({ createdAt: -1 });
    if (!assessments || assessments.length === 0) {
      console.log('No assessments found for courseId:', courseId);
      return res.status(404).json({ message: 'No assessments found for this course' });
    }

    res.json({ message: 'Assessments retrieved successfully', assessments });
  } catch (error) {
    console.error('Error fetching assessments by course:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Single Assessment
app.get('/api/assessments/:assessmentId', async (req, res) => {
  try {
    const assessmentId = req.params.assessmentId;
    console.log('Fetching assessment with ID:', assessmentId);

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      console.log('Assessment not found:', assessmentId);
      return res.status(404).json({ message: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Enrolled Courses
app.get('/api/enrollments/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const enrollments = await Enrollment.find({ studentId });
    const courseIds = enrollments.map(e => e.courseId);
    const courses = await Course.find({ _id: { $in: courseIds } });
    const formattedCourses = courses.map(course => {
      const formatted = {
        id: course._id.toString(),
        title: course.name || '',
        description: course.description || '',
        contents: course.contents || '',
        instructorId: course.instructorId || '',
        price: course.price || 0,
        thumbnail: course.thumbnail ? `http://localhost:3000${course.thumbnail}` : '',
        pdfs: course.pdfs ? course.pdfs.map(pdf => `http://localhost:3000${pdf}`) : [],
        youtubeLinks: course.youtubeLinks || []
      };
      console.log('Enrollment course:', formatted);
      return formatted;
    });
    res.json(formattedCourses);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Available Courses (all courses)
app.get('/api/courses/available/:userId', async (req, res) => {
  try {
    const courses = await Course.find()
      .select('_id name description contents instructorId price thumbnail')
      .lean();
    const mappedCourses = courses.map(course => {
      const mapped = {
        id: course._id.toString(),
        title: course.name || '',
        description: course.description || '',
        contents: course.contents || '',
        instructorId: course.instructorId || '',
        price: course.price || 0,
        thumbnail: course.thumbnail ? `http://localhost:3000${course.thumbnail}` : ''
      };
      console.log('Available course:', mapped);
      return mapped;
    });
    res.json(mappedCourses);
  } catch (err) {
    console.error('Error fetching available courses:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create Course
app.post('/api/instructor/courses', upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'pdfs', maxCount: 10 }
]), async (req, res) => {
  try {
    const { name, description, contents, price, youtubeLinks, instructorId } = req.body;
    console.log('Course creation request:', { name, description, contents, price, youtubeLinks, instructorId });

    if (!name || !description || !contents || !instructorId || price === undefined) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      console.log('Validation failed: Invalid price');
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    let parsedYoutubeLinks = [];
    try {
      parsedYoutubeLinks = JSON.parse(youtubeLinks || '[]');
      if (!Array.isArray(parsedYoutubeLinks)) {
        throw new Error('youtubeLinks must be an array');
      }
      parsedYoutubeLinks = parsedYoutubeLinks.map(url => {
        if (!url) return url;
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
        if (!normalizedUrl.match(/^https:\/\/(www\.)?youtube\.com\/watch\?v=/)) {
          throw new Error(`Invalid YouTube URL: ${url}`);
        }
        return normalizedUrl;
      });
    } catch (parseError) {
      console.log('Validation failed: Invalid youtubeLinks format:', parseError);
      return res.status(400).json({ message: parseError.message || 'Invalid youtubeLinks format' });
    }

    const files = req.files;
    const pdfFiles = files && files['pdfs'] ? files['pdfs'].map(file => `/uploads/${file.filename}`) : [];
    const thumbnailFile = files && files['thumbnail'] ? `/uploads/${files['thumbnail'][0].filename}` : '';

    const course = new Course({
      name,
      description,
      contents,
      pdfs: pdfFiles,
      youtubeLinks: parsedYoutubeLinks,
      instructorId,
      thumbnail: thumbnailFile,
      price: parsedPrice
    });

    await course.save();
    console.log('Created course:', course);
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (err) {
    console.error('Error creating course:', err);
    if (err.message.includes('Invalid file type') || err.message.includes('Invalid YouTube URL')) {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
});

// Enroll in a Course
app.post('/api/enrollments', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }
    const enrollment = new Enrollment({ studentId, courseId });
    await enrollment.save();
    res.status(201).json({ message: 'Enrollment successful' });
  } catch (err) {
    console.error('Error creating enrollment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('_id name email');
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email
    }));
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit Assessment Mark and Answers
app.post('/api/assessment_mark/submit', async (req, res) => {
  try {
    const { userId, assessmentId, answers, marks } = req.body;
    console.log('Assessment submission:', { userId, assessmentId, answers, marks });

    if (!userId || !assessmentId || !answers || marks === undefined) {
      return res.status(400).json({ message: 'userId, assessmentId, answers, and marks are required' });
    }

    // Check if user has already submitted this assessment
    const existingSubmission = await Submission.findOne({ studentId: userId, assessmentId });
    if (existingSubmission) {
      console.log('User has already submitted this assessment:', userId, assessmentId);
      return res.status(400).json({ message: 'You have already submitted this assessment.' });
    }

    // Validate answers format
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers must be an array' });
    }

    const newSubmission = new Submission({
      studentId: userId,
      assessmentId,
      score: parseFloat(marks),
      answers,
      submittedAt: new Date()
    });

    await newSubmission.save();
    console.log('Submission saved:', newSubmission);
    res.status(201).json({ message: 'Assessment submitted successfully', submission: newSubmission });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Modified Assessment Mark Submission to Use Submission Schema (Legacy Endpoint - Redirect to /submit)
app.post('/api/assessment_mark', async (req, res) => {
  try {
    const { studentId, studentName, courseId, marks } = req.body;
    console.log('Storing assessment mark:', { studentId, studentName, courseId, marks });

    if (!studentId || !courseId || marks === undefined) {
      return res.status(400).json({ message: 'studentId, courseId, and marks are required' });
    }

    // Find an assessment for the course
    const assessment = await Assessment.findOne({ courseId }).sort({ createdAt: -1 });
    if (!assessment) {
      console.log('No assessment found for courseId:', courseId);
      return res.status(404).json({ message: 'No assessment found for this course' });
    }

    // Check if user has already submitted this assessment
    const existingSubmission = await Submission.findOne({ studentId, assessmentId: assessment._id });
    if (existingSubmission) {
      console.log('User has already submitted this assessment:', studentId, assessment._id);
      return res.status(400).json({ message: 'You have already submitted this assessment.' });
    }

    const newSubmission = new Submission({
      assessmentId: assessment._id.toString(),
      studentId,
      score: parseFloat(marks),
      answers: [], // No answers provided in this legacy endpoint
      submittedAt: new Date()
    });

    await newSubmission.save();
    console.log('Submission saved:', newSubmission);
    res.status(201).json({ message: 'Assessment mark stored successfully', submission: newSubmission });
  } catch (error) {
    console.error('Error storing assessment mark:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Student Marks for UserPageComponent
app.get('/api/assessment_mark/student/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    console.log('Fetching assessment marks for studentId:', studentId);

    const submissions = await Submission.find({ studentId });
    if (!submissions || submissions.length === 0) {
      console.log('No submissions found for studentId:', studentId);
      return res.status(200).json({ message: 'No marks found for this student', marks: [] });
    }

    const markDetails = await Promise.all(submissions.map(async (submission) => {
      const assessment = await Assessment.findById(submission.assessmentId).select('title courseId');
      if (!assessment) {
        return null;
      }
      const course = await Course.findById(assessment.courseId).select('name');
      return {
        assessmentId: submission.assessmentId, // Include assessmentId
        assessmentName: assessment.title || 'Unknown Assessment',
        marks: submission.score,
        courseName: course ? course.name : 'Unknown Course',
        date: submission.submittedAt
      };
    }));

    const filteredMarks = markDetails.filter(mark => mark !== null);
    res.json({ message: 'Marks retrieved successfully', marks: filteredMarks });
  } catch (error) {
    console.error('Error fetching student marks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User Answers for Review
app.get('/api/assessment_mark/answers/:userId/:assessmentId', async (req, res) => {
  try {
    const { userId, assessmentId } = req.params;
    console.log('Fetching user answers for userId:', userId, 'and assessmentId:', assessmentId);

    const submission = await Submission.findOne({ studentId: userId, assessmentId });
    if (!submission) {
      console.log('No submission found for userId:', userId, 'and assessmentId:', assessmentId);
      return res.status(404).json({ message: 'No submission found' });
    }

    res.json(submission.answers);
  } catch (error) {
    console.error('Error fetching user answers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit Pending Course Request
app.post('/api/pending-courses', upload.fields([
  { name: 'pdfs', maxCount: 10 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  const { name, description, contents, youtubeLinks, instructorId, price } = req.body;
  console.log('Pending course request received:', { name, description, contents, youtubeLinks, instructorId, price });

  try {
    if (!name || !description || !contents || !instructorId || price === undefined) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      console.log('Validation failed: Invalid price');
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    let parsedYoutubeLinks = [];
    try {
      parsedYoutubeLinks = JSON.parse(youtubeLinks || '[]');
      if (!Array.isArray(parsedYoutubeLinks)) {
        throw new Error('youtubeLinks must be an array');
      }
    } catch (parseError) {
      console.log('Validation failed: Invalid youtubeLinks format:', parseError);
      return res.status(400).json({ message: 'Invalid youtubeLinks format' });
    }

    const files = req.files;
    const pdfFiles = files && files['pdfs'] ? files['pdfs'].map(file => `/uploads/${file.filename}`) : [];
    const thumbnailFile = files && files['thumbnail'] ? `/uploads/${files['thumbnail'][0].filename}` : '';

    const pendingCourse = new PendingCourse({
      name,
      description,
      contents,
      youtubeLinks: parsedYoutubeLinks,
      instructorId,
      price: parsedPrice,
      pdfs: pdfFiles,
      thumbnail: thumbnailFile,
      status: 'pending'
    });

    await pendingCourse.save();
    console.log('Pending course saved successfully:', pendingCourse);
    res.status(201).json({ message: 'Course request submitted successfully', pendingCourse });
  } catch (error) {
    console.error('Error submitting pending course:', error);
    if (error.message === 'Invalid file type. Only PDFs, JPEG, PNG, and JPG are allowed.') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Failed to submit course request', error: error.message });
    }
  }
});

// Get All Pending Courses
app.get('/api/pending-courses', async (req, res) => {
  try {
    const pendingCourses = await PendingCourse.find().sort({ createdAt: -1 }).select(
      '_id name description contents pdfs youtubeLinks instructorId thumbnail price status createdAt'
    );
    res.json(pendingCourses);
  } catch (error) {
    console.error('Error fetching pending courses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve a Pending Course
app.post('/api/pending-courses/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pendingCourse = await PendingCourse.findById(id);

    if (!pendingCourse) {
      return res.status(404).json({ message: 'Pending course not found' });
    }

    const newCourse = new Course({
      name: pendingCourse.name,
      description: pendingCourse.description,
      contents: pendingCourse.contents,
      pdfs: pendingCourse.pdfs,
      youtubeLinks: pendingCourse.youtubeLinks,
      instructorId: pendingCourse.instructorId,
      thumbnail: pendingCourse.thumbnail,
      price: pendingCourse.price,
      createdAt: pendingCourse.createdAt
    });

    await newCourse.save();
    await PendingCourse.findByIdAndDelete(id);

    console.log(`Course ${id} approved and moved to courses collection`);
    res.json({ message: 'Course approved successfully' });
  } catch (error) {
    console.error('Error approving course:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject a Pending Course
app.post('/api/pending-courses/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pendingCourse = await PendingCourse.findById(id);

    if (!pendingCourse) {
      return res.status(404).json({ message: 'Pending course not found' });
    }

    await PendingCourse.findByIdAndDelete(id);

    console.log(`Course ${id} rejected and removed`);
    res.json({ message: 'Course rejected successfully' });
  } catch (error) {
    console.error('Error rejecting course:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View Courses for Instructor
app.get('/api/courses/instructor/:instructorId', async (req, res) => {
  const { instructorId } = req.params;
  console.log('Fetching courses for instructorId:', instructorId);

  try {
    const courses = await Course.find({ instructorId }).sort({ createdAt: -1 });
    if (!courses || courses.length === 0) {
      console.log('No courses found:', instructorId);
      return res.status(404).json({ message: 'No courses found for this instructor' });
    }

    res.json({ message: 'Courses retrieved successfully', courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Single Course
app.get('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Fetching course with ID:', id);

  try {
    const course = await Course.findById(id);
    if (!course) {
      console.log('Course not found:', id);
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course retrieved successfully', course });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create Assessment
app.post('/api/assessments/create', async (req, res) => {
  const { title, questions, timeLimit, instructorId, courseId } = req.body;
  console.log('Create assessment request:', { title, timeLimit, instructorId, courseId });

  try {
    if (!title || !questions || !timeLimit || !instructorId || !courseId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one question' });
    }

    for (const q of questions) {
      if (!q.text || !q.options || q.options.length !== 4 || !q.correctAnswer || !q.marks) {
        return res.status(400).json({ message: 'Each question must have text, 4 options, a correct answer, and marks' });
      }
      if (q.correctAnswer < 1 || q.correctAnswer > 4) {
        return res.status(400).json({ message: 'Correct answer must be between 1 and 4' });
      }
      if (q.marks < 1) {
        return res.status(400).json({ message: 'Marks must be at least 1' });
      }
    }

    const newAssessment = new Assessment({
      title,
      questions,
      timeLimit,
      instructorId,
      courseId
    });

    const savedAssessment = await newAssessment.save();
    console.log('Assessment created:', savedAssessment);

    res.status(201).json({ message: 'Assessment created successfully', assessment: savedAssessment });
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ message: 'Failed to create assessment', error: error.message });
  }
});

// Update Course
app.put('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, contents, thumbnail, price, pdfs, youtubeLinks } = req.body;
  console.log('Update course request:', id);

  try {
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const updateData = {
      name: name || existingCourse.name,
      description: description || existingCourse.description,
      contents: contents || existingCourse.contents,
      thumbnail: thumbnail || existingCourse.thumbnail,
      price: price !== undefined ? parseFloat(price) : existingCourse.price,
      pdfs: Array.isArray(pdfs) ? pdfs : existingCourse.pdfs,
      youtubeLinks: Array.isArray(youtubeLinks) ? youtubeLinks : existingCourse.youtubeLinks
    };

    const updatedCourse = await Course.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course updated successfully', course: updatedCourse });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course', error: error.message });
  }
});

// File Upload for Course
app.post('/api/courses/:id/upload', upload.fields([
  { name: 'pdfs', maxCount: 10 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  console.log('Upload request for course:', id);

  try {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const files = req.files;
    const pdfFiles = files && files['pdfs'] ? files['pdfs'].map(file => `/uploads/${file.filename}`) : [];
    const thumbnailFile = files && files['thumbnail'] ? `/uploads/${files['thumbnail'][0].filename}` : null;

    const updatedPdfs = [...(course.pdfs || []), ...pdfFiles];
    const updatedThumbnail = thumbnailFile || course.thumbnail;

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { pdfs: updatedPdfs, thumbnail: updatedThumbnail },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Files uploaded successfully',
      pdfLinks: updatedPdfs,
      thumbnail: updatedThumbnail,
      course: updatedCourse
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Failed to upload files', error: error.message });
  }
});

// Get All Instructors
app.get('/api/instructors', async (req, res) => {
  try {
    const instructors = await Instructor.find().select('_id username name email mobile password');
    res.json(instructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Instructor
app.put('/api/instructors/:id', async (req, res) => {
  const { id } = req.params;
  const { username, name, email, mobile, password } = req.body;
  console.log('Update instructor request:', { id, username, name, email, mobile });

  try {
    const existingInstructor = await Instructor.findById(id);
    if (!existingInstructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    const duplicateInstructor = await Instructor.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: id }
    });
    if (duplicateInstructor) {
      if (duplicateInstructor.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (duplicateInstructor.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updateData = {
      username: username || existingInstructor.username,
      name: name || existingInstructor.name,
      email: email || existingInstructor.email,
      mobile: mobile || existingInstructor.mobile,
      password: password || existingInstructor.password
    };

    const updatedInstructor = await Instructor.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedInstructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    res.json({ message: 'Instructor updated successfully', instructor: updatedInstructor });
  } catch (error) {
    console.error('Error updating instructor:', error);
    res.status(500).json({ message: 'Failed to update instructor', error: error.message });
  }
});

// Delete Course by Instructor
app.delete('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const instructorId = req.headers['instructor-id'] || req.body.instructorId;

  try {
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== instructorId) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own courses' });
    }

    await Course.findByIdAndDelete(id);
    console.log(`Course ${id} deleted by instructor ${instructorId}`);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete Instructor
app.delete('/api/instructors/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Delete instructor request:', id);

  try {
    const courses = await Course.find({ instructorId: id });
    const pendingCourses = await PendingCourse.find({ instructorId: id });

    if (courses.length > 0 || pendingCourses.length > 0) {
      if (courses.length > 0) {
        await Course.deleteMany({ instructorId: id });
        console.log(`Deleted ${courses.length} courses for instructor ${id}`);
      }
      if (pendingCourses.length > 0) {
        await PendingCourse.deleteMany({ instructorId: id });
        console.log(`Deleted ${pendingCourses.length} pending courses for instructor ${id}`);
      }
    }

    const deletedInstructor = await Instructor.findByIdAndDelete(id);
    if (!deletedInstructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    res.json({ message: 'Instructor and associated courses deleted successfully' });
  } catch (error) {
    console.error('Error deleting instructor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User by ID
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      age: user.age,
      mobile: user.mobile,
      photo: user.photo
    };
    res.json(userResponse);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update User
app.put('/api/users/:userId', upload.single('photo'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, age, email, mobile, password } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updateData = {
      name: name || undefined,
      age: age ? parseInt(age) : undefined,
      email: email || undefined,
      mobile: mobile || undefined,
      password: password || undefined,
      photo: photo || undefined
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userResponse = {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      mobile: updatedUser.mobile,
      photo: updatedUser.photo
    };
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.message.includes('Invalid file type')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Reset User Password
app.post('/api/auth/reset-user-password', async (req, res) => {
  const { email, newPassword } = req.body;
  console.log('Reset user password request:', { email });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const updateResult = await User.updateOne(
      { email },
      { $set: { password: newPassword } }
    );

    if (updateResult.matchedCount === 0) {
      console.log('No user matched for update:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Password reset successful for user:', email);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get User by Email
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: user._id.toString(), name: user.name, email: user.email });
  } catch (err) {
    console.error('Error fetching user by email:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});