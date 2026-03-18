const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS  // Gmail App Password
    }
});
// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      mobile 
    });
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'No account found with this email' });

        // Generate secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes

        // Save token to user in DB
        await User.findOneAndUpdate({ email }, { resetToken, resetExpiry });

        // Reset link — points to frontend
        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        await transporter.sendMail({
            from: `"BuildnRise" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'BuildnRise — Password Reset Link',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #f97316;">BuildnRise Portfolio Manager</h2>
                    <p>Hi ${user.name},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <a href="${resetLink}" style="display:inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(to right, #f97316, #16a34a); color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Reset Password
                    </a>
                    <p style="color: #6b7280; font-size: 13px;">This link is valid for <strong>30 minutes</strong>. If you did not request this, ignore this email.</p>
                </div>
            `
        });

        res.json({ message: 'Password reset link sent to your email' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to send reset link' });
    }
});


router.post('/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6)
            return res.status(400).json({ message: 'Password must be at least 6 characters' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.resetToken !== token)
            return res.status(400).json({ message: 'Invalid reset link' });

        if (Date.now() > user.resetExpiry)
            return res.status(400).json({ message: 'Reset link has expired. Please request again.' });

        // Update password
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate(
            { email },
            { password: hashed, resetToken: null, resetExpiry: null }
        );

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Password reset failed' });
    }
});

module.exports = router;