import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { BatchCard } from "@/components/batches/BatchCard";
import { mockBatches, type BatchStatus } from "@/lib/mock-data";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Plus, FlaskConical } from "lucide-react";

const tabs: { label: string; value: BatchStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
  { label: "Discarded", value: "discarded" },
];

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Recently updated", value: "updated" },
];

export default function MyBatches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BatchStatus>("active");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  let filtered = mockBatches.filter((b) => b.status === activeTab);
  if (search) {
    filtered = filtered.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
  }
  if (sort === "newest") filtered.sort((a, b) => new Date(b.brewStartedAt).getTime() - new Date(a.brewStartedAt).getTime());
  if (sort === "oldest") filtered.sort((a, b) => new Date(a.brewStartedAt).getTime() - new Date(b.brewStartedAt).getTime());
  if (sort === "updated") filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pt-6 lg:pt-10 lg:px-8 space-y-5">
        <ScrollReveal>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">My Batches</h1>
            <Button size="sm" onClick={() => navigate("/new-batch")}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </ScrollReveal>

        {/* Search */}
        <ScrollReveal delay={0.05}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search batches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 w-10 flex items-center justify-center rounded-lg border transition-colors ${showFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </ScrollReveal>

        {/* Sort */}
        {showFilters && (
          <div className="flex gap-2 animate-slide-up">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sort === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <ScrollReveal delay={0.08}>
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {tabs.map((tab) => {
              const count = mockBatches.filter((b) => b.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs ${activeTab === tab.value ? "text-primary" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Batch List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <ScrollReveal>
              <div className="bg-card border border-border rounded-xl p-10 text-center">
                <FlaskConical className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="font-display text-lg font-medium text-foreground mb-1">
                  {search ? "No matches" : `No ${activeTab} batches`}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "active"
                    ? "Start your first kombucha batch to begin tracking"
                    : `You don't have any ${activeTab} batches yet`}
                </p>
                {activeTab === "active" && (
                  <Button onClick={() => navigate("/new-batch")}>
                    <Plus className="h-4 w-4" /> Start New Batch
                  </Button>
                )}
              </div>
            </ScrollReveal>
          ) : (
            filtered.map((batch, i) => (
              <ScrollReveal key={batch.id} delay={i * 0.05}>
                <BatchCard batch={batch} />
              </ScrollReveal>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
