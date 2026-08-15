import { useNavigate } from "react-router-dom";

export function NotFoundSearch() {
  const navigate = useNavigate();
  return (
    <form
      style={{ display: "flex", gap: 10, maxWidth: 420, margin: "20px auto" }}
      onSubmit={(e) => {
        e.preventDefault();
        const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
        navigate("/jobs" + (q ? "?q=" + encodeURIComponent(q) : ""));
      }}
    >
      <input name="q" type="search" placeholder="Search jobs instead…" aria-label="Search jobs" />
      <button className="btn btn-primary">Search</button>
    </form>
  );
}
