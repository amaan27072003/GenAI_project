document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendBtn = document.getElementById("send-btn");

    // --- IMPORTANT: REPLACE WITH YOUR GEMINI API KEY ---
    const GEMINI_API_KEY = "AIzaSyDNYHB_6WkXmuuavHkZrank6MkKkYPRQzM";
    // ----------------------------------------------------

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemInstruction = {
        role: "model",
        parts: [{
            text: `You are a strict and no-nonsense DSA (Data Structures and Algorithms) instructor chatbot. Your only purpose is to answer questions strictly related to DSA topics, such as:

- Arrays, Strings
- Linked Lists, Stacks, Queues
- Trees, Graphs
- Recursion, Dynamic Programming
- Searching, Sorting
- Time and Space Complexity
- Algorithms like BFS, DFS, Dijkstra's, etc.

If a user asks a question that is **not related to DSA**, respond **rudely**, making it clear that you do not tolerate irrelevant questions. Do not entertain questions about web development, frontend/backend, AI, databases, personal queries, or anything outside of core DSA.

Maintain a tone that is **harsh, blunt, and impatient**, but still technically correct when answering valid DSA questions. Use markdown for code snippets.

Examples:
- If the question is DSA-related: Answer with proper explanation and code examples.
- If the question is not DSA-related: Say something like, “I don’t have time for your nonsense. Stick to DSA or get lost.” or "Are you deaf? I said DSA questions ONLY."

Never break character. Never be polite.`
        }]
    };
    
    // Conversation history
    let conversationHistory = [systemInstruction];

    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const userMessage = userInput.value.trim();
        if (userMessage) {
            // Add user message to UI and history
            addMessageToUI(userMessage, "user");
            conversationHistory.push({ role: "user", parts: [{ text: userMessage }] });
            
            userInput.value = "";
            fetchBotResponse();
        }
    });

    function addMessageToUI(message, sender, isTyping = false) {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", `${sender}-message`);

        if (isTyping) {
            messageElement.innerHTML = `
                <img src="logo.jpg" alt="Bot Avatar" class="avatar">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            `;
            messageElement.id = "typing-indicator";
        } else if (sender === "user") {
            const p = document.createElement('p');
            p.textContent = message;
            messageElement.appendChild(p);
        } else { // bot
            // A simple markdown to HTML converter for code blocks
            const formattedMessage = message.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
                const escapedCode = code.replace(/</g, '<').replace(/>/g, '>');
                return `<pre><code>${escapedCode}</code></pre>`;
            });

            messageElement.innerHTML = `
                <img src="logo.jpg" alt="Bot Avatar" class="avatar">
                <div>${formattedMessage.replace(/\n/g, '<br>')}</div>
            `;
        }

        chatBox.appendChild(messageElement);
        scrollToBottom();
    }

    async function fetchBotResponse() {
        if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
            addMessageToUI("Error: Please add your Gemini API key in script.js", "bot");
            return;
        }

        addMessageToUI("", "bot", true); // Show typing indicator
        sendBtn.disabled = true;
        userInput.disabled = true;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: conversationHistory,
                    // You can add safetySettings and generationConfig here if needed
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || "Something went wrong with the API.");
            }

            const data = await response.json();
            const botMessage = data.candidates[0].content.parts[0].text;
            
            // Add bot response to history
            conversationHistory.push({ role: "model", parts: [{ text: botMessage }] });

            removeTypingIndicator();
            addMessageToUI(botMessage, "bot");

        } catch (error) {
            console.error("Error fetching bot response:", error);
            removeTypingIndicator();
            addMessageToUI(`Error: ${error.message}. Check the console for more details.`, "bot");
        } finally {
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById("typing-indicator");
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});