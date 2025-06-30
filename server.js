// At the top: Loads environment variables from a .env file
import 'dotenv/config';

import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import express from "express";

// --- Basic Setup ---
const app = express();
const PORT = process.env.PORT || 3000;
const platform = os.platform();
const asyncExecute = promisify(exec);

// --- Gemini AI Setup ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in the .env file");
}
const ai = new GoogleGenAI(apiKey);

// --- Tool Definition ---
async function executeCommand({ command }) {
  console.log(`Executing: ${command}`);
  try {
    const { stdout, stderr } = await asyncExecute(command);
    if (stdout) console.log(`Stdout:\n${stdout}`);
    if (stderr) console.error(`Stderr:\n${stderr}`);
    
    let result = `Command executed successfully.`;
    if (stdout) result += `\nOutput (stdout):\n${stdout}`;
    if (stderr) result += `\nPossible Warnings (stderr):\n${stderr}`;
    
    return result;
  } catch (error) {
    console.error(`Execution Failure: ${error.message}`);
    return `Error during command execution: ${error.message}`;
  }
}

const executeCommandDeclaration = {
    name: "executeCommand",
    description: "Execute a single, non-interactive terminal/shell command. This command can create folders, create files, write to files, or delete files. Use '&&' to chain simple, related commands in a single step.",
    parameters: {
        type: "OBJECT",
        properties: {
            command: {
                type: "STRING",
                description: "The terminal command to execute. For example: 'mkdir calculator' or 'echo \"<h1>Hello</h1>\" > calculator/index.html'"
            },
        },
        required: ["command"],
    },
};

const availableTools = { executeCommand };

// --- Express Server Setup ---
app.use(express.json());
app.use(express.static("public"));

// --- API Endpoint for the AI Agent ---
app.post("/api/run-agent", async (req, res) => {
    const { userProblem } = req.body;
    if (!userProblem) {
        return res.status(400).json({ error: "userProblem is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent({ type: "log", message: "Agent started. Analyzing your request..." });

        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `You are a world-class website builder AI. Your task is to create a complete, working website based on the user's request by executing terminal commands.
            Your environment is: ${platform}. You MUST provide commands compatible with this OS.
            **Process:**
            1.  Analyze the request and plan the necessary files (HTML, CSS, JS, etc.).
            2.  Generate and execute commands ONE BY ONE using the 'executeCommand' tool.
            3.  Start by creating a main project directory.
            4.  Then create the necessary files inside it (e.g., index.html, style.css, script.js).
            5.  Write the full, complete code for each file in a SINGLE command. Do not write code line-by-line.
                - For Linux/macOS, ALWAYS prefer 'cat <<EOF > path/to/filename.ext'.
                - For Windows (win32), use chained 'echo' commands, carefully escaping special characters with '^'.
            6.  After executing ALL necessary commands, your FINAL step is to respond with a text message to the user confirming the task is complete. DO NOT call the tool again after you are finished.`,
            tools: [{ functionDeclarations: [executeCommandDeclaration] }],
        });

        const chat = model.startChat({
             history: [{ role: "user", parts: [{ text: userProblem }] }]
        });

        for (let i = 0; i < 20; i++) { // Safety break
            const result = await chat.sendMessage("Proceed with the next step.");
            const response = result.response;
            const functionCalls = response.functionCalls();

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                sendEvent({ type: "command", message: `Executing command:\n${call.args.command}` });
                const toolResult = await availableTools[call.name](call.args);
                sendEvent({ type: "result", message: `Result:\n${toolResult}` });
                await chat.sendMessage([{ functionResponse: { name: call.name, response: { content: toolResult } } }]);
            } else {
                const text = response.text();
                sendEvent({ type: "done", message: text });
                break; 
            }
        }
    } catch (error) {
        console.error("Agent run error:", error);
        sendEvent({ type: "error", message: `An unexpected error occurred: ${error.message}` });
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log("Make sure you have a .env file with your GEMINI_API_KEY.");
});