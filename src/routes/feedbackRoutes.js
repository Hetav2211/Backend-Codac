import { Router } from "express";
const router = Router();
import Feedback from "../models/Feedback.js";

router.post("/", async (req, res) => {
  try {
    const { name, email, message, rating } = req.body;
    if (!name || !email || !message || !rating) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    }

    const feedback = new Feedback({ name, email, message, rating });
    await feedback.save();

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
