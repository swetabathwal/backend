const express = require('express');
const User = require('./user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const { sendOtpEmail } = require('./emailservice');

let otpStore = {}; // Temporary store for OTPs (use a database in production)
// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user with hashed password
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User created successfully', name: user.name, email: user.email });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        console.log(user);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(isMatch);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Generate token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(token,'Token generated successfully');

        res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// Endpoint to send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  console.log(email);
  if (!email) return res.status(400).json({ message: 'Email is required' });

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(otp);
  // Store OTP with expiry time
  const otpExpiry = parseInt(process.env.OTP_EXPIRY_TIME, 10) || 300000; // default 5 minutes
  otpStore[email] = { otp, expiresAt: Date.now() + otpExpiry };
console.log(otpStore);
  try {
    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res.status(400).json({ message: 'No OTP found for this email' });
  }

  // Check if OTP is valid and not expired
  if (storedOtp.otp === otp && storedOtp.expiresAt > Date.now()) {
    // OTP is valid
    delete otpStore[email]; // Clear OTP after successful verification
    return res.status(200).json({ message: 'Email verified successfully' });
  }

  return res.status(400).json({ message: 'Invalid or expired OTP' });
});



module.exports = router;
