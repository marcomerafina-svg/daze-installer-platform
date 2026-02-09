interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: string;
}

export default function Toggle({ checked, onChange, size = 'md', disabled = false, label }: ToggleProps) {
  const isMd = size === 'md';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex shrink-0 rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none
        ${isMd ? 'w-[44px] h-[24px]' : 'w-[36px] h-[20px]'}
        ${checked ? 'bg-daze-forest' : 'bg-daze-gray'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-[2px] rounded-full bg-white
          transition-all duration-200 ease-in-out
          ${isMd ? 'w-[20px] h-[20px]' : 'w-[16px] h-[16px]'}
          ${checked
            ? isMd ? 'left-[22px]' : 'left-[18px]'
            : 'left-[2px]'
          }
        `}
      />
    </button>
  );
}
