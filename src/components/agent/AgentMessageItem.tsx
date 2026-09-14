import React, { useState } from "react";
import {
  VscAccount,
  VscSparkle,
  VscLightbulb,
  VscChevronDown,
  VscChevronRight,
  VscCopy,
  VscCheck,
  VscNote,
} from "react-icons/vsc";
import { AgentMessage } from "../../store/agentStore";
import { ToolCallItem } from "./ToolCallItem";

interface AgentMessageItemProps {
  message: AgentMessage;
}

export const AgentMessageItem: React.FC<AgentMessageItemProps> = ({ message }) => {
  const [showThought, setShowThought] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 1500);
  };

  // Detect artifact references in message
  const hasPlan = message.content.toLowerCase().includes("implementation_plan.md") || message.content.includes("Implementation Plan");
  const hasWalkthrough = message.content.toLowerCase().includes("walkthrough.md") || message.content.includes("Walkthrough");

  return (
    <div className={`p-3 group relative select-text transition-colors ${
      isUser ? "bg-vsc-sidebar/40 border-b border-vsc-border/30" : "bg-transparent border-b border-vsc-border/20"
    }`}>
      {/* Sender Header */}
      <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-400">
        {isUser ? (
          <>
            <div className="w-5 h-5 rounded bg-gray-700/60 flex items-center justify-center text-gray-300">
              <VscAccount className="text-xs" />
            </div>
            <span className="font-semibold text-gray-200">You</span>
          </>
        ) : (
          <div className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <VscSparkle className="text-xs" />
          </div>
        )}

        <span className="text-[10px] text-gray-500 ml-auto">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        {/* Quick Message Copy Button */}
        <button
          onClick={handleCopy}
          title="Copy message content"
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-opacity text-xs"
        >
          {copiedMessage ? <VscCheck className="text-green-400" /> : <VscCopy />}
        </button>
      </div>

      {/* Collapsible Chain-of-Thought / Reasoning */}
      {message.thought && (
        <div className="my-2 border border-amber-500/20 bg-amber-500/5 rounded-lg text-xs overflow-hidden">
          <div
            onClick={() => setShowThought(!showThought)}
            className="px-2.5 py-1.5 flex items-center gap-2 cursor-pointer text-amber-300/90 hover:text-amber-200 text-[11px] font-medium transition-colors"
          >
            <VscLightbulb className="text-xs text-amber-400" />
            <span>Thinking Process</span>
            <span className="text-[10px] text-amber-500/70 font-mono">
              ({message.thought.length} chars)
            </span>
            <span className="ml-auto text-xs">
              {showThought ? <VscChevronDown /> : <VscChevronRight />}
            </span>
          </div>

          {showThought && (
            <div className="p-2.5 border-t border-amber-500/15 text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed font-mono bg-black/20">
              {message.thought}
            </div>
          )}
        </div>
      )}

      {/* Artifact Cards (Antigravity Plan & Walkthrough) */}
      {!isUser && (hasPlan || hasWalkthrough) && (
        <div className="my-2 p-2.5 rounded-lg border border-blue-500/30 bg-blue-950/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <VscNote className="text-blue-400 text-base" />
            <div>
              <div className="font-semibold text-blue-300 text-[11px]">
                {hasPlan ? "Implementation Plan Artifact" : "Walkthrough Artifact"}
              </div>
              <p className="text-[10px] text-gray-400">
                {hasPlan ? "Structured design, open questions & verification plan" : "Execution summary & verification report"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tool Call Cards */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="my-2 space-y-1">
          {message.toolCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* Message Content */}
      {message.content && (
        <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans select-text">
          {message.content}
        </div>
      )}
    </div>
  );
};
