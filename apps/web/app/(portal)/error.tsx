'use client';

type PortalErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function PortalError({ error, reset }: PortalErrorProps) {
  const message =
    error.name === 'PortalApiReadError'
      ? error.message
      : 'Nao foi possivel carregar os dados operacionais do portal.';

  return (
    <section
      style={{
        display: 'grid',
        gap: '16px',
        alignContent: 'start',
        padding: '32px',
        margin: '24px',
        border: '1px solid rgba(255, 140, 140, 0.24)',
        borderRadius: '16px',
        background: 'rgba(59, 20, 24, 0.42)',
        boxShadow: '0 18px 42px rgba(1, 8, 20, 0.2)'
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          width: 'fit-content',
          padding: '6px 10px',
          borderRadius: '999px',
          background: 'rgba(255, 140, 140, 0.12)',
          color: 'var(--critical)',
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
      >
        Operacao interrompida
      </span>
      <div style={{ display: 'grid', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', lineHeight: 1.05 }}>
          Falha ao carregar o portal autenticado
        </h1>
        <p style={{ margin: 0, maxWidth: '64ch', color: 'var(--text-muted)' }}>
          {message}
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: '1px solid rgba(142, 213, 255, 0.2)',
            borderRadius: '12px',
            background: 'rgba(142, 213, 255, 0.08)',
            color: 'var(--text)',
            padding: '10px 14px'
          }}
        >
          Tentar novamente
        </button>
      </div>
    </section>
  );
}
