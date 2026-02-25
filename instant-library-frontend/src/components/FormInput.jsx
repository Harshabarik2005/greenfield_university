// FormInput – reusable labeled input matching Figma design
export default function FormInput({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    required,
    icon,
    min,
    step,
    className = '',
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="text-sm font-semibold text-zinc-700">{label}</label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-sm select-none">
                        {icon}
                    </span>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    required={required}
                    min={min}
                    step={step}
                    className={`
            w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900
            placeholder:text-zinc-400 outline-none
            transition-[border-color,box-shadow] duration-150
            focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10
            disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-9' : ''}
          `}
                />
            </div>
        </div>
    );
}
