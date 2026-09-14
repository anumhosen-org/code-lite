import React, { useState } from "react";
import {
  VscClose,
  VscSettingsGear,
  VscCheck,
  VscTerminal,
  VscTerminalPowershell,
  VscTerminalCmd,
  VscTerminalBash,
  VscTerminalLinux,
  VscFolder,
  VscEdit,
} from "react-icons/vsc";
import {
  useSettingsStore,
  ProviderType,
  WordWrapMode,
  AutoSaveMode,
  LineNumbersMode,
} from "../../store/settingsStore";
import { useTerminalStore } from "../../store/terminalStore";

type SettingsTab = ProviderType | "terminal" | "editor";

export const SettingsModal: React.FC = () => {
  const {
    isModalOpen,
    setModalOpen,
    activeProvider,
    setActiveProvider,
    providers,
    updateProviderConfig,
    editorSettings,
    updateEditorSettings,
  } = useSettingsStore();

  const { profiles, defaultProfileId, setDefaultProfileId } = useTerminalStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("editor");

  if (!isModalOpen) return null;

  const currentConfig = providers[activeProvider];

  const providerTabs: Array<{ id: ProviderType; label: string; desc: string }> = [
    {
      id: "ollama",
      label: "Ollama (Local)",
      desc: "Run local open-source models with zero latency and full privacy.",
    },
    {
      id: "openai-compatible",
      label: "OpenAI / OpenRouter / DeepSeek",
      desc: "Use OpenRouter, DeepSeek, OpenAI, vLLM, or any compatible endpoint.",
    },
    {
      id: "anthropic",
      label: "Anthropic Claude",
      desc: "Claude 3.7 Sonnet / Claude 3.5 Sonnet Messages API.",
    },
    {
      id: "gemini",
      label: "Google Gemini",
      desc: "Gemini 2.0 Flash / Pro API with function calling.",
    },
  ];

  const getShellIcon = (icon?: string) => {
    switch (icon) {
      case "powershell":
      case "pwsh":
        return <VscTerminalPowershell className="text-sky-400 text-sm" />;
      case "cmd":
        return <VscTerminalCmd className="text-neutral-300 text-sm" />;
      case "bash":
      case "git-bash":
        return <VscTerminalBash className="text-amber-400 text-sm" />;
      case "wsl":
        return <VscTerminalLinux className="text-emerald-400 text-sm" />;
      default:
        return <VscTerminal className="text-gray-400 text-sm" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-vsc-sidebar border border-vsc-border rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-xs text-vsc-text select-none">
        {/* Modal Header */}
        <div className="h-11 px-4 bg-vsc-activity flex items-center justify-between border-b border-vsc-border">
          <div className="flex items-center gap-2">
            <VscSettingsGear className="text-blue-400 text-base" />
            <span className="font-semibold text-gray-200 text-sm">Settings: Preferences & Environment</span>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1 hover:bg-vsc-hover rounded text-gray-400 hover:text-white"
          >
            <VscClose className="text-base" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex h-[460px]">
          {/* Left Category Tabs */}
          <div className="w-56 bg-vsc-activity/40 border-r border-vsc-border p-2 flex flex-col gap-1 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Preferences
            </div>
            <button
              onClick={() => setActiveTab("editor")}
              className={`text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                activeTab === "editor"
                  ? "bg-vsc-selected text-white font-medium"
                  : "text-gray-300 hover:bg-vsc-hover"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <VscEdit className="text-purple-400 text-xs flex-shrink-0" />
                <span className="truncate">Text Editor</span>
              </div>
              {activeTab === "editor" && <VscCheck className="text-xs ml-1 flex-shrink-0" />}
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                activeTab === "terminal"
                  ? "bg-vsc-selected text-white font-medium"
                  : "text-gray-300 hover:bg-vsc-hover"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <VscTerminal className="text-blue-400 text-xs flex-shrink-0" />
                <span className="truncate">Terminal Profiles</span>
              </div>
              {activeTab === "terminal" && <VscCheck className="text-xs ml-1 flex-shrink-0" />}
            </button>

            <div className="mt-3 px-2 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              AI Providers
            </div>
            {providerTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveProvider(tab.id);
                  }}
                  className={`text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-vsc-selected text-white font-medium"
                      : "text-gray-300 hover:bg-vsc-hover"
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {isActive && <VscCheck className="text-xs ml-1 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            {activeTab === "editor" ? (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
                    <VscEdit className="text-purple-400" />
                    Text Editor Settings
                  </h3>
                  <p className="text-gray-400 text-[11px]">
                    Configure code rendering, minimap, word wrapping, and auto save behavior.
                  </p>
                </div>

                {/* Display & Layout */}
                <div className="flex flex-col gap-3 p-3 bg-vsc-bg/50 border border-vsc-border/60 rounded-md">
                  <div className="font-semibold text-gray-300 text-xs uppercase tracking-wider text-[10px]">
                    Display & Layout
                  </div>

                  {/* Minimap Toggle */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="font-medium text-gray-200 text-xs">Minimap Overview</div>
                      <div className="text-gray-400 text-[10px]">
                        Controls whether the code overview minimap is shown on the right.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editorSettings.minimap}
                      onChange={(e) => updateEditorSettings({ minimap: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Word Wrap */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-200 text-xs">Word Wrap</div>
                      <div className="text-gray-400 text-[10px]">
                        Controls how lines should wrap in the editor.
                      </div>
                    </div>
                    <select
                      value={editorSettings.wordWrap}
                      onChange={(e) => updateEditorSettings({ wordWrap: e.target.value as WordWrapMode })}
                      className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="off">Off (No wrap)</option>
                      <option value="on">On (Wrap at viewport)</option>
                      <option value="wordWrapColumn">Word Wrap Column</option>
                      <option value="bounded">Bounded</option>
                    </select>
                  </div>

                  {/* Line Numbers */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-200 text-xs">Line Numbers</div>
                      <div className="text-gray-400 text-[10px]">
                        Controls the display of line numbers in the gutter.
                      </div>
                    </div>
                    <select
                      value={editorSettings.lineNumbers}
                      onChange={(e) => updateEditorSettings({ lineNumbers: e.target.value as LineNumbersMode })}
                      className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                      <option value="relative">Relative</option>
                    </select>
                  </div>

                  {/* Bracket Pair Colorization */}
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="font-medium text-gray-200 text-xs">Bracket Pair Colorization</div>
                      <div className="text-gray-400 text-[10px]">
                        Colorizes matching brackets for visual clarity.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editorSettings.bracketPairColorization}
                      onChange={(e) => updateEditorSettings({ bracketPairColorization: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Files & Auto Save */}
                <div className="flex flex-col gap-3 p-3 bg-vsc-bg/50 border border-vsc-border/60 rounded-md">
                  <div className="font-semibold text-gray-300 text-xs uppercase tracking-wider text-[10px]">
                    Files & Auto Save
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-200 text-xs">Auto Save</div>
                      <div className="text-gray-400 text-[10px]">
                        Controls how dirty files are automatically saved to disk.
                      </div>
                    </div>
                    <select
                      value={editorSettings.autoSave}
                      onChange={(e) => updateEditorSettings({ autoSave: e.target.value as AutoSaveMode })}
                      className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="off">Off (Manual Ctrl+S)</option>
                      <option value="afterDelay">After Delay (Idle typing)</option>
                      <option value="onFocusChange">On Focus Change (Blur/tab switch)</option>
                    </select>
                  </div>

                  {editorSettings.autoSave === "afterDelay" && (
                    <div className="flex flex-col gap-1.5 pt-1 border-t border-vsc-border/40 animate-in fade-in-50 duration-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium">Auto Save Delay:</span>
                        <span className="text-blue-400 font-mono font-bold text-[11px]">{editorSettings.autoSaveDelay} ms</span>
                      </div>
                      <input
                        type="range"
                        min="500"
                        max="5000"
                        step="250"
                        value={editorSettings.autoSaveDelay}
                        onChange={(e) => updateEditorSettings({ autoSaveDelay: parseInt(e.target.value, 10) })}
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                        <span>500ms</span>
                        <span>1000ms (Default)</span>
                        <span>5000ms</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography & Spacing */}
                <div className="flex flex-col gap-3 p-3 bg-vsc-bg/50 border border-vsc-border/60 rounded-md">
                  <div className="font-semibold text-gray-300 text-xs uppercase tracking-wider text-[10px]">
                    Typography & Spacing
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-gray-300 font-medium text-[11px]">Font Size (px)</label>
                      <input
                        type="number"
                        min="10"
                        max="28"
                        value={editorSettings.fontSize}
                        onChange={(e) => updateEditorSettings({ fontSize: Math.max(10, Math.min(28, parseInt(e.target.value, 10) || 13)) })}
                        className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-gray-300 font-medium text-[11px]">Line Height</label>
                      <input
                        type="number"
                        min="14"
                        max="38"
                        value={editorSettings.lineHeight}
                        onChange={(e) => updateEditorSettings({ lineHeight: Math.max(14, Math.min(38, parseInt(e.target.value, 10) || 20)) })}
                        className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-gray-300 font-medium text-[11px]">Tab Size</label>
                      <select
                        value={editorSettings.tabSize}
                        onChange={(e) => updateEditorSettings({ tabSize: parseInt(e.target.value, 10) })}
                        className="bg-vsc-sidebar border border-vsc-border rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value={2}>2 Spaces</option>
                        <option value={4}>4 Spaces</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "terminal" ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
                    <VscTerminal className="text-blue-400" />
                    Default Terminal Profile
                  </h3>
                  <p className="text-gray-400 text-[11px]">
                    Select the default shell profile used when opening new terminals with <kbd className="px-1 py-0.5 bg-vsc-bg border border-vsc-border rounded font-mono text-[10px]">Ctrl+`</kbd> or the <kbd className="px-1 py-0.5 bg-vsc-bg border border-vsc-border rounded font-mono text-[10px]">+</kbd> button.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-gray-300 font-medium text-xs">
                    Available System Profiles ({profiles.length} detected)
                  </label>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {profiles.map((prof) => {
                      const isDefault = prof.id === defaultProfileId;
                      return (
                        <div
                          key={prof.id}
                          onClick={() => setDefaultProfileId(prof.id)}
                          className={`flex items-start gap-3 p-2.5 rounded border transition-all cursor-pointer ${
                            isDefault
                              ? "bg-blue-950/30 border-blue-500/50 shadow-sm"
                              : "bg-vsc-bg/60 border-vsc-border/60 hover:bg-vsc-hover/40"
                          }`}
                        >
                          <div className="mt-0.5">{getShellIcon(prof.icon)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-200 text-xs">
                                {prof.name}
                              </span>
                              {isDefault && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-[10px] truncate mt-0.5 font-mono">
                              <VscFolder className="text-gray-500 flex-shrink-0" />
                              <span className="truncate">{prof.path}</span>
                            </div>
                          </div>
                          {isDefault && (
                            <VscCheck className="text-blue-400 text-sm flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-blue-900/15 border border-blue-500/20 text-[11px] text-blue-300/90 leading-relaxed">
                  Tip: You can also switch profiles dynamically per tab or select default profiles from the dropdown arrow next to the terminal <span className="font-mono font-bold">+</span> button.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">
                    {providerTabs.find((p) => p.id === activeProvider)?.label}
                  </h3>
                  <p className="text-gray-400 text-[11px]">
                    {providerTabs.find((p) => p.id === activeProvider)?.desc}
                  </p>
                </div>

                {/* Base URL */}
                <div className="flex flex-col gap-1">
                  <label className="text-gray-300 font-medium">Base URL</label>
                  <input
                    type="text"
                    value={currentConfig.baseUrl}
                    onChange={(e) =>
                      updateProviderConfig(activeProvider, { baseUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="bg-vsc-bg border border-vsc-border rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* API Key (if not local ollama) */}
                <div className="flex flex-col gap-1">
                  <label className="text-gray-300 font-medium">
                    API Key {activeProvider === "ollama" ? "(Optional)" : ""}
                  </label>
                  <input
                    type="password"
                    value={currentConfig.apiKey}
                    onChange={(e) =>
                      updateProviderConfig(activeProvider, { apiKey: e.target.value })
                    }
                    placeholder={
                      activeProvider === "ollama"
                        ? "None needed for local Ollama"
                        : "sk-..."
                    }
                    className="bg-vsc-bg border border-vsc-border rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Model Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-gray-300 font-medium">Model Name</label>
                  <input
                    type="text"
                    value={currentConfig.model}
                    onChange={(e) =>
                      updateProviderConfig(activeProvider, { model: e.target.value })
                    }
                    placeholder="e.g. qwen2.5-coder:latest, gpt-4o, claude-3-7-sonnet-20250219"
                    className="bg-vsc-bg border border-vsc-border rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-vsc-border mt-4">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
