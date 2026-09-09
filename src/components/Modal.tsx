import { useEffect, useRef, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./ui/Primitives";
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby={id}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <IconButton label="بستن پنجره" onClick={onClose}>
          <X size={21} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
