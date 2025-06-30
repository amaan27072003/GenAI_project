document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("prompt-form");
    const input = document.getElementById("prompt-input");
    const button = document.getElementById("submit-button");
    const chatLog = document.getElementById("chat-log");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userProblem = input.value.trim();
        if (!userProblem) return;

        setFormState(true);
        addMessage(userProblem, "user");
        input.value = "";

        try {
            const response = await fetch("/api/run-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userProblem }),
            });

            if (!response.body) throw new Error("Response body is missing.");
            
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    addMessage("✨ Agent has finished the process.", "ai", "done");
                    break;
                }
                
                const events = value.split("\n\n").filter(Boolean);
                for (const event of events) {
                    if (event.startsWith("data: ")) {
                        const dataStr = event.substring(6);
                        try {
                            const data = JSON.parse(dataStr);
                            handleEvent(data);
                        } catch (error) {
                            console.error("Failed to parse JSON:", dataStr);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
            addMessage(`An error occurred: ${error.message}`, "ai", "error");
        } finally {
            setFormState(false);
        }
    });

    function setFormState(isLoading) {
        input.disabled = isLoading;
        button.disabled = isLoading;
    }

    function addMessage(text, sender, type = 'log') {
        const messageElement = document.createElement("div");
        messageElement.classList.add("message", sender);

        const contentElement = document.createElement("div");
        contentElement.classList.add("content");

        if (type === 'command' || type === 'result') {
            const pre = document.createElement('pre');
            pre.textContent = text;
            contentElement.appendChild(pre);
        } else {
            contentElement.textContent = text;
        }

        messageElement.appendChild(contentElement);
        chatLog.appendChild(messageElement);
        scrollToBottom();
    }

    function handleEvent(data) {
        switch (data.type) {
            case "log":
            case "done":
            case "error":
                addMessage(data.message, "ai", data.type);
                break;
            case "command":
            case "result":
                addMessage(data.message, "ai", data.type);
                break;
            default:
                console.warn("Unknown event type:", data.type);
        }
    }

    function scrollToBottom() {
        chatLog.parentElement.scrollTop = chatLog.parentElement.scrollHeight;
    }
});