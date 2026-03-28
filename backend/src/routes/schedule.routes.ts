import { Router, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyClerkToken, AuthRequest } from "../middleware/clerk.middleware";

const router = Router();

// ── CREATE SCHEDULE ROW (Mentor) ───────────────────────────
router.post(
  "/create",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can create schedules" });
      return;
    }

    const {
      date,
      time_label,
      time_value,
      description,
      join_code,
      student_email,
    } = req.body;

    if (!date) {
      res.status(400).json({ error: "Date is required" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("class_schedules")
        .insert({
          mentor_id: req.userId,
          date,
          time_label: time_label || "",
          time_value: time_value || "",
          description: description || "",
          join_code: join_code || "",
          student_email: student_email || "",
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(201).json({ schedule: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET MY SCHEDULES (Mentor) ──────────────────────────────
router.get(
  "/my",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("mentor_id", req.userId)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time_value", { ascending: true });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ schedules: data || [] });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET ASSIGNED SCHEDULES (Student by email) ──────────────
router.get(
  "/assigned",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { createClerkClient } = await import("@clerk/backend");
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const user = await clerk.users.getUser(req.userId!);
      const email = user.emailAddresses[0]?.emailAddress;

      if (!email) {
        res.status(200).json({ schedules: [] });
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("student_email", email)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time_value", { ascending: true });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ schedules: data || [] });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── UPDATE SCHEDULE ROW (Mentor) ───────────────────────────
router.patch(
  "/update/:scheduleId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can update schedules" });
      return;
    }

    const scheduleId = req.params.scheduleId as string;
    const {
      date,
      time_label,
      time_value,
      description,
      join_code,
      student_email,
    } = req.body;

    try {
      const { data, error } = await supabase
        .from("class_schedules")
        .update({
          ...(date !== undefined && { date }),
          ...(time_label !== undefined && { time_label }),
          ...(time_value !== undefined && { time_value }),
          ...(description !== undefined && { description }),
          ...(join_code !== undefined && { join_code }),
          ...(student_email !== undefined && { student_email }),
        })
        .eq("id", scheduleId)
        .eq("mentor_id", req.userId)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ schedule: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── DELETE SCHEDULE ROW (Mentor) ───────────────────────────
router.delete(
  "/:scheduleId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can delete schedules" });
      return;
    }

    const scheduleId = req.params.scheduleId as string;

    try {
      const { error } = await supabase
        .from("class_schedules")
        .delete()
        .eq("id", scheduleId)
        .eq("mentor_id", req.userId);

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ message: "Schedule deleted" });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
