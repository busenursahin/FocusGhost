import { useT } from "../constants.js";

export function ProjectBadge({ project, small }) {
  const T = useT();
  if (!project) {
    return <span style={{ fontSize: small ? 9 : 10, color: T.textMuted, fontWeight: 600 }}>Proje yok</span>;
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: `${project.color}18`, border: `1px solid ${project.color}44`,
      borderRadius: 8, padding: small ? "2px 7px" : "3px 9px",
      fontSize: small ? 9 : 10, fontWeight: 700, color: project.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: project.color, display: "inline-block" }} />
      {project.name}
    </span>
  );
}
