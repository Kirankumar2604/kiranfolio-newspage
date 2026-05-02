import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { categoryConfig, type TechCategory, type NewsResponse } from "@shared/schema";
import { Header } from "@/components/Header";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Hero } from "@/components/Hero";
import { ArticleGrid } from "@/components/ArticleGrid";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Footer } from "@/components/Footer";

function getFiltersFromLocation() {
  if (typeof window === "undefined") {
    return {
      activeCategory: "all" as TechCategory,
      searchQuery: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category") as TechCategory | null;
  const searchParam = params.get("q") ?? "";
  const activeCategory = categoryParam && categoryParam in categoryConfig ? categoryParam : "all";

  return {
    activeCategory,
    searchQuery: searchParam,
  };
}

export default function Home() {
  const initialFilters = useMemo(() => getFiltersFromLocation(), []);
  const [activeCategory, setActiveCategory] = useState<TechCategory>(initialFilters.activeCategory);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);

  useEffect(() => {
    const syncFromLocation = () => {
      const nextFilters = getFiltersFromLocation();
      setActiveCategory(nextFilters.activeCategory);
      setSearchQuery(nextFilters.searchQuery);
    };

    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (activeCategory !== "all") {
      params.set("category", activeCategory);
    }

    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }

    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [activeCategory, searchQuery]);

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    params.append("category", activeCategory);
    if (searchQuery) {
      params.append("q", searchQuery);
    }
    return `/api/news?${params.toString()}`;
  };

  const { data, isLoading, error } = useQuery<NewsResponse>({
    queryKey: [buildQueryUrl()],
  });

  const handleCategoryChange = (category: TechCategory) => {
    setActiveCategory(category);
    setSearchQuery("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveCategory("all");
  };

  const handleReset = () => {
    setActiveCategory("all");
    setSearchQuery("");
  };

  const articles = data?.articles || [];
  const hasNoResults = !isLoading && articles.length === 0;
  const [heroArticle, ...restArticles] = articles;
  const activeFilterLabel = searchQuery.trim()
    ? `Search: ${searchQuery.trim()}`
    : categoryConfig[activeCategory].label;

  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={handleSearch} searchQuery={searchQuery} />
      <CategoryFilter 
        activeCategory={activeCategory} 
        onCategoryChange={handleCategoryChange}
      />
      
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 grid gap-6 lg:grid-cols-[1.5fr_0.9fr] lg:items-end">
            <div className="space-y-4 max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-primary">Tech News, Cleanly Curated</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                The latest stories from the companies shaping the next wave of technology.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Browse top headlines, narrow by company, or search directly for the topics you care about.
                Filters now stay in the URL so you can share and reopen the exact view.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-background/80 backdrop-blur px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current View</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{activeFilterLabel}</p>
              </div>
              <div className="rounded-2xl border bg-background/80 backdrop-blur px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Articles</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{articles.length.toLocaleString()} loaded</p>
              </div>
            </div>
          </div>
        </section>

        {isLoading && <LoadingSkeleton />}
        {error && <EmptyState type="error" onReset={handleReset} />}
        {hasNoResults && <EmptyState type="no-results" onReset={handleReset} />}
        {!isLoading && !error && articles.length > 0 && (
          <>
            {heroArticle && <Hero article={heroArticle} />}
            {restArticles.length > 0 && <ArticleGrid articles={restArticles} />}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
