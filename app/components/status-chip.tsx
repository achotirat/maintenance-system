export function StatusChip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      className="text-[11px] font-semibold rounded-full px-2.5 py-[3px] whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}
