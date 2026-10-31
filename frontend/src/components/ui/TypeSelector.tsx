import { cn } from '../../utils/cn';

export interface TypeSelectorOption<T extends string | number> {
  value: T;
  label: string;
  badge?: string;
}

export interface TypeSelectorProps<T extends string | number> {
  options: TypeSelectorOption<T>[];
  value: T;
  onChange: (val: T) => void;
  label?: string;
  className?: string;
}

export function TypeSelector<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: TypeSelectorProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const widthPercent = 100 / options.length;

  return (
    <div className={cn('type-selector-wrapper w-full text-left', className)}>
      {label && (
        <label className="block text-[10px] font-bold tracking-[0.2em] text-[#555555] uppercase mb-2 select-none">
          {label}
        </label>
      )}
      <div className="type-selector-track relative flex w-full border border-[#E5E5E5] bg-[#F7F7F5] p-1">
        {/* Sliding active indicator */}
        <div
          className="type-selector-indicator absolute top-1 bottom-1 bg-[#111111] transition-transform duration-500 ease-in-out"
          style={{
            width: `calc(${widthPercent}% - 0.25rem)`,
            transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 0.25}rem))`,
          }}
        />
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'type-selector-btn relative flex-1 py-4 text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-500 ease-in-out z-10 text-center select-none',
                isSelected ? 'text-white' : 'text-[#555555] hover:text-[#111111]'
              )}
            >
              <span className="type-selector-label">{opt.label}</span>
              {opt.badge && (
                <span
                  className={cn(
                    'type-selector-badge ml-2 text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-none uppercase',
                    isSelected ? 'bg-white text-[#111111]' : 'bg-[#E5E5E5] text-[#555555]'
                  )}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
