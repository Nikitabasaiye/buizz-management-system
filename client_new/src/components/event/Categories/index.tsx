const categories = ["Movies", "Concerts", "Comedy", "Workshops", "Sports", "Festivals"];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-black">Categories</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <button key={category} className="min-h-24 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-4 text-left font-black">
            {category}
          </button>
        ))}
      </div>
    </section>
  );
}
