import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";

const router = Router();

// SIGNUP
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !role) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  if (!["mentor", "student"].includes(role)) {
    res.status(400).json({ error: "Role must be mentor or student" });
    return;
  }

  try {
    // Create auth user in Supabase
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      res.status(400).json({ error: authError?.message || "Signup failed" });
      return;
    }

    // Save user profile in users table
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      full_name,
      role,
    });

    if (profileError) {
      res.status(400).json({ error: profileError.message });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: authData.user.id, email, role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: authData.user.id, email, full_name, role },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// LOGIN
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    // Sign in with Supabase auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: profile.id, email: profile.email, role: profile.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET CURRENT USER
router.get("/me", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.id)
      .single();

    if (error || !profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ user: profile });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
