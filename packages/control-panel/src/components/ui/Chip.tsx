import './Chip.css';

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${selected ? 'chip--selected' : ''}`}
    >
      {label}
    </button>
  );
}
