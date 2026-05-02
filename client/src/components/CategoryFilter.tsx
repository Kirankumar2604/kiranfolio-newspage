import { categoryConfig, type TechCategory } from "@shared/schema";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  activeCategory: TechCategory;
  onCategoryChange: (category: TechCategory) => void;
}

const categories: TechCategory[] = [
  "all",
  "google",
  "apple",
  "microsoft",
  "meta",
  "tesla",
  "amazon",
  "openai",
  "nvidia",
];

export function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="sticky top-16 md:top-20 z-40 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={`inline-flex items-center rounded-full border px-6 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 no-default-active-elevate ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => onCategoryChange(category)}
                  aria-pressed={isActive}
                  data-testid={`button-category-${category}`}
                >
                  {categoryConfig[category].label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
