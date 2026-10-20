export default function SearchBar({ action, q, placeholder }: { action: string; q: string; placeholder: string }) {
  return <form action={action} className="flex gap-2"><input name="q" defaultValue={q} placeholder={placeholder} className="w-full max-w-sm rounded-full border border-rose-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-berry" /><button className="rounded-full bg-roseink px-5 py-2.5 text-sm font-bold text-white">Search</button></form>;
}
export function Pager({ base, q, page, hasMore }: { base: string; q: string; page: number; hasMore: boolean }) {
  const href = (p: number) => `${base}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return <div className="mt-4 flex items-center gap-3 text-sm font-bold">{page > 1 && <a className="text-berry" href={href(page - 1)}>← Previous</a>}<span className="text-roseink/50">Page {page}</span>{hasMore && <a className="text-berry" href={href(page + 1)}>Next →</a>}</div>;
}
