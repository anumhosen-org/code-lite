import React, { useState } from "react";
import {
  VscAccount,
  VscSparkle,
  VscLightbulb,
  VscChevronDown,
  VscChevronRight,
} from "react-icons/vsc";
import { AgentMessage } from "../../store/agentStore";
import { ToolCallItem } from "./ToolCallItem";

interface AgentMessageItemProps {
  message: AgentMessage;
}

export const AgentMessageItem: React.FC<AgentMessageItemProps> = ({ message }) => {
  const [showThought, setShowThought] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`p-3 select-text ${isUser ? "bg-vsc-sidebar/40" : "bg-transparent"}`}>
      {/* Sender Header */}
      <div className="flex items-center gap-2 mb-1.5 text-xs text-gray-400">
        {isUser ? (
          <>
            <VscAccount className="text-gray-300 text-sm" />
            <span className="font-semibold text-gray-300">You</span>
          </>
        ) : (
          <>
            <VscSparkle className="text-blue-400 text-sm" />
            <span className="font-semibold text-blue-300">Code Lite Agent</span>
          </>
        )}
        <span className="text-[10px] text-gray-500 ml-auto">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Collapsible Chain-of-Thought / Reasoning */}
      {message.thought && (
        <div className="my-1.5 border border-amber-500/20 bg-amber-500/5 rounded text-xs overflow-hidden">
          <div
            onClick={() => setShowThought(!showThought)}
            className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer text-amber-300/80 hover:text-amber-200 text-[11px] font-medium transition-colors"
          >
            <VscLightbulb className="text-xs text-amber-400" />
            <span>Thinking Process</span>
            <span className="ml-auto text-xs">
              {showThought ? <VscChevronDown /> : <VscChevronRight />}
            </span>
          </div>

          {showThought && (
            <div className="p-2 border-t border-amber-500/10 text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed">
              {message.thought}
            </div>
          )}
        </div>
      )}

      {/* Tool Call Cards */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="my-1.5">
          {message.toolCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* Message Content */}
      {message.content && (
        <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
          {message.content}
        </div>
      )}
    </div>
  );
};
