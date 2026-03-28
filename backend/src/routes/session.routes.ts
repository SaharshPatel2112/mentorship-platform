import { Router, Response } from "express";
import { supabase } from "../config/supabase";
import { verifyClerkToken, AuthRequest } from "../middleware/clerk.middleware";
import { nanoid } from "nanoid";

const router = Router();

const generateJoinCode = () => nanoid(8).toUpperCase();

// ── CREATE SESSION (Mentor only) ───────────────────────────
router.post(
  "/create",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can create sessions" });
      return;
    }

    const {
      title,
      language = "javascript",
      date_label = "",
      time_label = "",
      description = "",
      assigned_student_email = "",
    } = req.body;

    if (!title) {
      res.status(400).json({ error: "Session title is required" });
      return;
    }

    try {
      const joinCode = generateJoinCode();

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          mentor_id: req.userId,
          title,
          join_code: joinCode,
          language,
          status: "waiting",
          date_label,
          time_label,
          description,
          assigned_student_email,
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(201).json({
        message: "Session created successfully",
        session: data,
        joinLink: `${process.env.FRONTEND_URL}/session/join/${joinCode}`,
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/join/:joinCode",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "student") {
      res.status(403).json({ error: "Only students can join sessions" });
      return;
    }

    const joinCode = req.params.joinCode as string;

    try {
      const { data: session, error: findError } = await supabase
        .from("sessions")
        .select("*")
        .eq("join_code", joinCode.toUpperCase())
        .single();

      if (findError || !session) {
        res
          .status(404)
          .json({ error: "Session not found. Check your join code." });
        return;
      }

      if (session.status === "ended") {
        res.status(400).json({ error: "This session has already ended." });
        return;
      }

      const updatePayload: Record<string, unknown> = {
        status: "active",
      };

      if (!session.student_id) {
        updatePayload.student_id = req.userId;
        updatePayload.started_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await supabase
        .from("sessions")
        .update(updatePayload)
        .eq("id", session.id)
        .select()
        .single();

      if (updateError) {
        res.status(400).json({ error: updateError.message });
        return;
      }

      res.status(200).json({
        message: "Joined session successfully",
        session: updated,
      });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── FIND SESSION BY JOIN CODE ──────────────────────────────
router.get(
  "/find/:joinCode",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const joinCode = req.params.joinCode as string;

    try {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("join_code", joinCode.toUpperCase())
        .single();

      if (error || !session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      res.status(200).json({ session });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── END SESSION (Mentor only) ──────────────────────────────
router.patch(
  "/end/:sessionId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can end sessions" });
      return;
    }

    const sessionId = req.params.sessionId as string;

    try {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("mentor_id", req.userId)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      await supabase.from("messages").delete().eq("session_id", sessionId);

      res.status(200).json({ message: "Session ended", session: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET MY SESSIONS ────────────────────────────────────────
router.get(
  "/my",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = supabase.from("sessions").select("*");

      if (req.userRole === "mentor") {
        query = query.eq("mentor_id", req.userId);
      } else {
        query = query.eq("student_id", req.userId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ sessions: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET ACTIVE SESSION ─────────────────────────────────────
router.get(
  "/active",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let query = supabase.from("sessions").select("*").eq("status", "active");

      if (req.userRole === "mentor") {
        query = query.eq("mentor_id", req.userId);
      } else {
        query = query.eq("student_id", req.userId);
      }

      const { data, error } = await query.single();

      if (error) {
        res.status(200).json({ session: null });
        return;
      }

      res.status(200).json({ session: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── FIND SESSION BY ID ─────────────────────────────────────
router.get(
  "/find-by-id/:sessionId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = req.params.sessionId as string;

    try {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      res.status(200).json({ session });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET LATEST CODE SNAPSHOT ───────────────────────────────
router.get(
  "/snapshot/:sessionId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = req.params.sessionId as string;

    try {
      const { data, error } = await supabase
        .from("code_snapshots")
        .select("*")
        .eq("session_id", sessionId)
        .order("saved_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        res.status(200).json({ snapshot: null });
        return;
      }

      res.status(200).json({ snapshot: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── UPDATE SESSION (Mentor only) ───────────────────────────
router.patch(
  "/update/:sessionId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (req.userRole !== "mentor") {
      res.status(403).json({ error: "Only mentors can edit sessions" });
      return;
    }

    const sessionId = req.params.sessionId as string;
    const {
      date_label,
      time_label,
      description,
      assigned_student_email,
      join_code,
    } = req.body;

    try {
      const { data, error } = await supabase
        .from("sessions")
        .update({
          ...(date_label !== undefined && { date_label }),
          ...(time_label !== undefined && { time_label }),
          ...(description !== undefined && { description }),
          ...(assigned_student_email !== undefined && {
            assigned_student_email,
          }),
          ...(join_code !== undefined && { join_code }),
        })
        .eq("id", sessionId)
        .eq("mentor_id", req.userId)
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ session: data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── GET ASSIGNED SESSIONS (Student) ───────────────────────
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
        res.status(200).json({ sessions: [] });
        return;
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .or(`student_id.eq.${req.userId},assigned_student_email.eq.${email}`)
        .order("created_at", { ascending: true });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(200).json({ sessions: data || [] });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── REJOIN SESSION ─────────────────────────────────────────
router.patch(
  "/rejoin/:sessionId",
  verifyClerkToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = req.params.sessionId as string;

    try {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      if (session.status === "ended") {
        res.status(400).json({ error: "Session has already ended" });
        return;
      }

      res.status(200).json({ session });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
