import { useState } from "react";
import { ApiKeysBar } from "@/components/tools/ApiKeysBar";
import { ToolList } from "@/components/tools/ToolList";
import { ToolTemplatePicker, type ToolTemplate, TOOL_TEMPLATES, BLANK_TEMPLATE } from "@/components/tools/ToolTemplates";
import { ToolBuilder } from "@/components/tools/ToolBuilder";
import { ToolActivityLog } from "@/components/tools/ToolActivityLog";
import type { Tool } from "@/hooks/use-tools";

type View = "list" | "templates" | "builder" | "edit";

export default function Tools() {
  const [view, setView] = useState<View>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const handleSelectTemplate = (template: ToolTemplate) => {
    setSelectedTemplate(template);
    setView("builder");
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setView("edit");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Give your AI agent superpowers. Create tools that let the AI book appointments, update your CRM, or trigger automations — all during the call.
        </p>
      </div>

      {/* API Keys Bar */}
      <ApiKeysBar />

      {/* Views */}
      {view === "list" && (
        <>
          <ToolList onCreateNew={() => setView("templates")} onEdit={handleEditTool} />
          <ToolActivityLog />
        </>
      )}

      {view === "templates" && (
        <ToolTemplatePicker onSelect={handleSelectTemplate} />
      )}

      {view === "builder" && selectedTemplate && (
        <ToolBuilder
          template={selectedTemplate}
          onBack={() => { setView("templates"); setSelectedTemplate(null); }}
          onSaved={() => { setView("list"); setSelectedTemplate(null); }}
        />
      )}

      {view === "edit" && editingTool && (
        <ToolBuilder
          template={TOOL_TEMPLATES.find((t) => t.id === editingTool.template) || BLANK_TEMPLATE}
          existingTool={editingTool}
          onBack={() => { setView("list"); setEditingTool(null); }}
          onSaved={() => { setView("list"); setEditingTool(null); }}
        />
      )}
    </div>
  );
}
