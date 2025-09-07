import { GoogleGenAI } from "@google/genai";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const platform = os.platform();
const asyncExecute = promisify(exec);

const History = [];
const ai = new GoogleGenAI({
  apiKey: "AIzaSyCJaqRx7BV2DMJb8_BSyw_NIOCPtnrgtq0",
});

// Creating a tool which excecute the terminal command or shell command.

async function executeCommand({ command }) {
  try {
    const { stdout, stderr } = await asyncExecute(command);
    if (stderr) {
      return `Error executing command: ${stderr}`;
    }
    return `Command executed successfully: ${stdout} || Task completed successfully.`;
  } catch (error) {
    return `Error executing command: ${error}`;
  }
}

const executeCommandDeclaration = {
  name: "executeCommand",
  description:
    "Execute a single terminal/shell command.This command can be create the folder, file, write on file, edit the file or delete the file.",
  parameters: {
    type: "OBJECT",
    properties: {
      command: {
        type: "STRING",
        description:
          "It will be a single terminal command. For example: 'mkdir calculator'",
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand,
};

async function runAgent(userProblem) {
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `you are a website builder expert. And your task is to create a website based on the user problem or input. You have access of any shell or terminal command.

        Current user operation system is : ${platform}
        Give command to user according to its operating system support.  
        
        <-- The job you have to perform -->
        1. Analyze the user problem and to see what type of website they want to build for you.
        2. Give the command one by one , step by step
        3. Use available tools to executeCommand.
        4. You have access to a tool named \`executeCommand\` that can run terminal/shell commands like:
- \`mkdir\`, \`touch\`
- \`cat <<EOF > filename ... EOF\` for writing content into files

        // Now you have to give them command in the following order below:
        1. First create a folder, Ex: mkdir "calculator".
        2. Inside the folder, create a index.html , Ex: touch "calculator/index.html".
        3. Then create a CSS file,style.css, Ex: touch "calculator/style.css".
        4. Then create a JavaScript file,script.js Ex: touch "calculator/script.js".
        5. Then write the HTML code inside the index.html file EX: echo ^<!DOCTYPE html^> > index.html
echo ^<html^> >> index.html
echo ^<head^> >> index.html
echo     ^<title^>My Website^</title^> >> index.html
echo ^</head^> >> index.html
echo ^<body^> >> index.html
echo     ^<h1^>Hello from CMD^</h1^> >> index.html
echo ^</body^> >> index.html
echo ^</html^> >> index.html
.
        6. Then write the CSS code inside the style.css file EX: echo body { > style.css
echo     font-family: Arial, sans-serif; >> style.css
echo     background-color: #f0f0f0; >> style.css
echo } >> style.css
.
        7. Then write the JavaScript code inside the script.js file Ex: echo console.log("Hello from CMD"); > script.js
.

        You have to provide the terminal command to user, they will directly execute it.

        `,
        tools: [
          {
            functionDeclarations: [executeCommandDeclaration],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(response.functionCalls[0]);
      const { name, args } = response.functionCalls[0];

      const funcall = availableTools[name];
      const result = await funcall(args);

      const functionResponsePart = {
        name: name,
        response: { result: result },
      };

      History.push({
        role: "model",
        parts: [
          {
            functionCall: response.functionCalls[0],
          },
        ],
      });
      // result  history
      History.push({
        role: "user",
        parts: [
          {
            functionResponse: functionResponsePart,
          },
        ],
      });
    } else {
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      console.log("Gemini:", response.text);
      break;
    }
  }
}

async function main() {
  console.log(
    "Welcome to the AI Pair Programmer!: I am cursor, your AI assistant."
  );
  const userProblem = readlineSync.question("Ask me anything --> ");
  await runAgent(userProblem);
  // Optionally keep looping
  main();
}

main();
