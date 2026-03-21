import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { getGuideBySlug } from "@/content/guides";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, FlaskConical } from "lucide-react";

export default function GuideDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const guide = guideArticles.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 pt-20 text-center">
          <p className="text-muted-foreground">Guide not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/guides")}>Back to guides</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-4 lg:pt-8 lg:px-8 space-y-6 pb-8">
        <button onClick={() => navigate("/guides")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Guides
        </button>

        <ScrollReveal>
          <div className="space-y-3">
            <span className="inline-block px-2.5 py-1 rounded-full bg-honey-light text-xs font-medium text-primary">
              {guide.category}
            </span>
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground leading-tight">
              {guide.title}
            </h1>
            <p className="text-muted-foreground">{guide.summary}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {guide.readTime} read
            </div>
          </div>
        </ScrollReveal>

        <div className="space-y-8">
          {guide.sections.map((section, i) => (
            <ScrollReveal key={i} delay={i * 0.06}>
              <div className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                  {section.body.split("**").map((part, j) =>
                    j % 2 === 0 ? part : <strong key={j} className="font-semibold text-foreground">{part}</strong>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.2}>
          <div className="bg-honey-light border border-primary/10 rounded-xl p-5 text-center">
            <FlaskConical className="h-6 w-6 mx-auto text-primary mb-2" />
            <h3 className="font-display text-base font-semibold text-foreground mb-1">Ready to brew?</h3>
            <p className="text-sm text-muted-foreground mb-3">Put this knowledge to work.</p>
            <Button onClick={() => navigate("/new-batch")}>Start New Batch</Button>
          </div>
        </ScrollReveal>
      </div>
    </AppLayout>
  );
}
