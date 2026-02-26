import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
}

export function Input({ label, id, className = "", ...props }: InputProps) {
	return (
		<div className={`input-group ${className}`}>
			{label && (
				<label htmlFor={id} className="input-label">
					{label}
				</label>
			)}
			<input id={id} className="input-field" {...props} />
		</div>
	);
}
