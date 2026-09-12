
import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState("session-1");

  const startNewThread = () => {
    const newId = "session-" + Math.random().toString(36).substring(2, 9);
    setThreadId(newId);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message;

    // Add user's message immediately
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    // Clear input
    setMessage("");

    // Add an empty AI message.
    // We will keep updating this message as chunks arrive.
    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content: "",
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          thread_id: threadId,
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      if (!res.body) {
        throw new Error("Response body is empty");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, {
          stream: true,
        });

        // Append the newly received chunk
        // to the existing AI message.
        setMessages((previous) => {
          const updatedMessages = [...previous];

          const lastMessageIndex = updatedMessages.length - 1;

          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content:
              updatedMessages[lastMessageIndex].content + chunk,
          };

          return updatedMessages;
        });
      }

      // Flush any remaining characters in the decoder
      const remaining = decoder.decode();

      if (remaining) {
        setMessages((previous) => {
          const updatedMessages = [...previous];

          const lastMessageIndex = updatedMessages.length - 1;

          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content:
              updatedMessages[lastMessageIndex].content + remaining,
          };

          return updatedMessages;
        });
      }
    } catch (error) {
      console.error(error);

      setMessages((previous) => {
        const updatedMessages = [...previous];

        const lastMessageIndex = updatedMessages.length - 1;

        updatedMessages[lastMessageIndex] = {
          ...updatedMessages[lastMessageIndex],
          content: "Error connecting to backend.",
        };

        return updatedMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  }

  return (
    <div className="app">
      <div className="chat-container">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h1 style={{ margin: 0 }}>LangGraph Chatbot</h1>
            <small style={{ color: "#888" }}>Thread ID: {threadId}</small>
          </div>
          <button 
            onClick={startNewThread}
            style={{ padding: "6px 12px", fontSize: "0.85rem", background: "#4a5568", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            New Thread
          </button>
        </div>

        <div className="messages">

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role}`}
            >
              <strong>
                {msg.role === "user" ? "You" : "AI"}
              </strong>

              <p>{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <strong>AI</strong>
              <p>Thinking...</p>
            </div>
          )}

        </div>

        <div className="input-area">

          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <button
            onClick={sendMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? "Generating..." : "Send"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default App;

