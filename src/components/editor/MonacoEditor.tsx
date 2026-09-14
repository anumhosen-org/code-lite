import React, { useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { EditorTab } from "../../types";
import { useEditorStore } from "../../store/editorStore";
import { useSettingsStore } from "../../store/settingsStore";

interface MonacoEditorProps {
  tab: EditorTab;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ tab }) => {
  const { updateTabContent, saveActiveFile } = useEditorStore();
  const { editorSettings } = useSettingsStore();
  const editorRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor;
    editor.focus();

    editor.onDidBlurEditorText(() => {
      if (useSettingsStore.getState().editorSettings.autoSave === "onFocusChange") {
        saveActiveFile();
      }
    });
  };

  // Auto Save: afterDelay debounced file write
  useEffect(() => {
    if (editorSettings.autoSave === "afterDelay" && tab.isDirty && !tab.diffMode) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveActiveFile();
      }, Math.max(300, editorSettings.autoSaveDelay));
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    tab.content,
    tab.isDirty,
    tab.diffMode,
    editorSettings.autoSave,
    editorSettings.autoSaveDelay,
    saveActiveFile,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActiveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveActiveFile]);

  return (
    <div className="h-full w-full bg-vsc-editor overflow-hidden">
      <Editor
        height="100%"
        theme="vs-dark"
        path={tab.filePath}
        defaultLanguage={tab.language}
        language={tab.language}
        value={tab.content}
        onChange={(val) => {
          if (val !== undefined) {
            updateTabContent(tab.id, val);
          }
        }}
        onMount={handleEditorDidMount}
        options={{
          fontSize: editorSettings.fontSize,
          lineHeight: editorSettings.lineHeight,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: editorSettings.minimap, scale: 0.8 },
          automaticLayout: true,
          tabSize: editorSettings.tabSize,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
          wordWrap: editorSettings.wordWrap,
          lineNumbers: editorSettings.lineNumbers,
          renderWhitespace: "selection",
        }}
      />
    </div>
  );
};
