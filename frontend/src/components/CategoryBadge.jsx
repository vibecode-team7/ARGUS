import React from "react";
import { getCategoryLabel, getCategoryIcon } from "../lib/category";

/**
 * @param {{ category: string }} props
 */
function CategoryBadge({ category }) {
  const Icon = getCategoryIcon(category);

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-accent-light text-accent">
      <Icon size={12} />
      {getCategoryLabel(category)}
    </span>
  );
}

export default React.memo(CategoryBadge);
