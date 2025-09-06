import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import apiRoutes from "./routes/apiRoutes.js";
import editor from "./controllers/socketController.js";
import authRoutes from "./routes/authRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import Stripe from "stripe";
import path from "path";
import chatBotRoutes from "./routes/chatBotRoutes.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();

// CORS Setup
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://frontend-codac.vercel.app",
  /\.vercel\.app$/, // Allow all Vercel preview URLs
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.some((o) =>
          typeof o === "string"
            ? o === origin
            : o instanceof RegExp && o.test(origin)
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Root endpoint to indicate server is running
app.get("/", (req, res) => {
  res.json({
    message: "Server is running successfully!",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", apiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/chatbot", chatBotRoutes);

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const plans = {
  Pro: { price: 79900, name: "Pro" }, // ₹799.00
  Team: { price: 249900, name: "Team" }, // ₹2499.00
};

app.post("/create-checkout-session", async (req, res) => {
  const { plan, price } = req.body;
  const selected = plans[plan];

  if (!selected)
    return res.status(400).json({ error: "Invalid plan selected" });

  // Use discounted price if provided and valid
  let finalPrice = selected.price;
  if (typeof price === "number" && price > 0 && price < selected.price) {
    finalPrice = price * 100; // Convert to paise if price is in rupees
    if (price > 1000) finalPrice = price; // If already in paise
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `${selected.name} Plan`,
            },
            unit_amount: finalPrice,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Socket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.some((o) =>
          typeof o === "string"
            ? o === origin
            : o instanceof RegExp && o.test(origin)
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});
editor(io);

// MongoDB & Server Start
const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Exiting...`);
        process.exit(1);
      } else {
        console.error(err);
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
  });

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}
