import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { guides } from "@/content/guides";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { guidesCopy } from "@/copy/guides";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, ChevronRight, Clock, ShieldAlert } from "lucide-react";

const categories = [...new Set(guides.map((g) => g.category))];

export default function Guides() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  let filtered = guides;
  if (search) {
    filtered = filtered.filter(
      (g) =>
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.summary.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (selectedCat) {
    filtered = filtered.filter((g) => g.category === selectedCat);
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-5">
        <ScrollReveal>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            {guidesCopy.page.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{guidesCopy.page.description}</p>
        </ScrollReveal>

        <ScrollReveal delay={0.03}>
          <section className="rounded-xl border border-primary/15 bg-honey-light p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {guidesCopy.assistant.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guidesCopy.assistant.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/assistant")}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {guidesCopy.assistant.action}
              </button>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={guidesCopy.search.placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCat(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedCat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {guidesCopy.categories.all}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCat === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {filtered.map((guide, i) => (
            <ScrollReveal key={guide.id} delay={i * 0.04}>
              <button
                onClick={() => navigate(`/guides/${guide.slug}`)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-honey-light flex items-center justify-center shrink-0">
                    <BookOpen className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {guide.summary}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {guide.readTime}
                      </span>
                      <span>{guidesCopy.card.separator}</span>
                      <span>{guide.category}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
