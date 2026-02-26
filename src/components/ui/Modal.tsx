import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface ModalProps {
	open: boolean;
	title: string;
	children: ReactNode;
	onClose: () => void;
}

export function Modal({ open, title, children, onClose }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	if (!open) return null;

	return createPortal(
		<dialog ref={dialogRef} className="modal-dialog">
			<div className="modal-content">
				<div className="modal-header">
					<h3 className="modal-title">{title}</h3>
					<Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
						✕
					</Button>
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</dialog>,
		document.getElementById("modal-root")!,
	);
}
