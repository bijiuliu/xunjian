export function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-4 px-1">
      <h2 className="text-title font-black tracking-tight">{title}</h2>
    </div>
  );
}
