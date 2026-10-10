"use client";

export function ConfirmButton({ message, children, className, name, value }: { message: string; children: React.ReactNode; className?: string; name?: string; value?: string }) {
  return (
    <button
      className={className}
      name={name}
      value={value}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
