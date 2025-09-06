import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


function isStrongPassword(password) {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return strongPasswordRegex.test(password);
}

export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: "Password must be minimum 8 characters, include uppercase, lowercase, number and special character."
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword)

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      plan: "Free", // Set default plan
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        plan: newUser.plan, // Return plan
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error during signup" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }
    // Generate JWT token

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    
    if (!token) {
      return res.status(400).json({ message: "token not generated" });
    }
    res.status(200).json({ user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan // Return plan on login
    }, token });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};