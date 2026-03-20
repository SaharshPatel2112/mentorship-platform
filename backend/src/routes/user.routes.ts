import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";

const router = Router();

// Sync Clerk user to Supabase
router.post("/sync", async (req: Request, res: Response): Promise<void> => {
  const { clerkId, email, full_name, role } = req.body;

  if (!clerkId || !email || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", clerkId)
      .single();

    if (existing) {
      res.status(200).json({ message: "User already exists" });
      return;
    }

    const { error } = await supabase.from("users").insert({
      id: clerkId,
      email,
      full_name: full_name || email,
      role,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ message: "User synced successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
