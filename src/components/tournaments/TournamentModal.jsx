import { X } from 'lucide-react';

export default function TournamentModal({
  title,
  onClose,
  children
}) {
  return (
    <div
      className="tournament-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="tournament-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="tournament-modal-header">
          <div>
            <p className="eyebrow">
              LPA Finanzas
            </p>

            <h2>{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
