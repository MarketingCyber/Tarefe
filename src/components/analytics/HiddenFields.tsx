/** Re-submits the current view's other settings along with a native form (custom dates, landing text, advanced pivot). */
export function HiddenFields({ query }: { query: string }) {
  return (
    <>
      {[...new URLSearchParams(query).entries()].map(([k, v], i) => (
        <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}
