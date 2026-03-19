import { getCampaignSuggestions } from "@/lib/enrollment-periods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CampaignSuggestions() {
  const navigate = useNavigate();
  const suggestions = getCampaignSuggestions();

  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="card-title flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          Suggested Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.title} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-lg shrink-0">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate("/campaigns/new")}>
              Create
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
