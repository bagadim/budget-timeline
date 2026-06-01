export function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      + {label}
    </button>
  );
}
