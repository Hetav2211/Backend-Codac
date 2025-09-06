import express from "express";
import editor  from "../controllers/socketController.js";
import User from "../models/User.js";
const router = express.Router();

// Test API route
router.get("/editor", editor);

// Update user plan
router.post("/user/plan", async (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!userId || !plan) {
      return res.status(400).json({ message: "userId and plan are required" });
    }
    const user = await User.findByIdAndUpdate(userId, { plan }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Plan updated", plan: user.plan });
  } catch (err) {
    res.status(500).json({ message: "Failed to update plan", error: err.message });
  }
});

export default router;