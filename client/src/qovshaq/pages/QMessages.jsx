// Qovshaq Phase 3 — Messages (wrapper around existing chat)
import { useNavigate } from "react-router-dom";
import QButton from "../components/QButton";

export default function QMessages() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{"\u{1F4AC}"}</div>
      <h2 className="font-q-display text-2xl text-q-text mb-3">Messages</h2>
      <p className="text-q-text-muted text-sm mb-6 max-w-sm mx-auto">
        Your conversations are available in the main BridgeAZ messaging system.
      </p>
      <QButton onClick={() => navigate("/chats")}>
        Open Messages
      </QButton>
    </div>
  );
}
