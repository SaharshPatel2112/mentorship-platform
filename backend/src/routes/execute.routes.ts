import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { promisify } from "util";
import path from "path";
import os from "os";

const router = Router();
const execAsync = promisify(exec);

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { language, code } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: "Language and code required" });
    return;
  }

  console.log(`Executing ${language}`);

  // Create temp file
  const tmpDir = os.tmpdir();
  const ext: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
  };

  const fileName = `mentorspace_${Date.now()}.${ext[language] || "js"}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    writeFileSync(filePath, code, "utf8");

    let command = "";

    switch (language) {
      case "javascript":
        command = `node "${filePath}"`;
        break;
      case "python":
        command = `python "${filePath}"`;
        break;
      case "typescript":
        command = `npx ts-node "${filePath}"`;
        break;
      case "java": {
        // Java needs class name = file name
        const className = "Main";
        const javaFile = path.join(tmpDir, `${className}.java`);
        writeFileSync(javaFile, code, "utf8");
        command = `cd "${tmpDir}" && javac ${className}.java && java ${className}`;
        break;
      }
      case "cpp": {
        const outFile = path.join(tmpDir, `mentorspace_${Date.now()}`);
        command = `g++ "${filePath}" -o "${outFile}" && "${outFile}"`;
        break;
      }
      default:
        res.status(200).json({
          stdout: "",
          stderr: `Language "${language}" not supported for execution`,
          code: 1,
        });
        return;
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 10000, // 10 second limit
    });

    res.status(200).json({
      stdout: stdout || "",
      stderr: stderr || "",
      code: 0,
    });
  } catch (err: unknown) {
    const error = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    res.status(200).json({
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "Execution failed",
      code: 1,
    });
  } finally {
    try {
      unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
});

export default router;
