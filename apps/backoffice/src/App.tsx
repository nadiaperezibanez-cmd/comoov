import { colors } from '@comoov/shared';

// Squelette du back-office interne. Les modules réels (validation des
// documents conducteurs, liste des courses, gestion des litiges) arrivent
// au Sprint 6.
const modules = [
  {
    titre: 'Validation des conducteurs',
    description: 'Vérifier permis, carte grise et assurance ; valider ou refuser.',
  },
  {
    titre: 'Courses',
    description: 'Suivi des courses, statuts et horodatages.',
  },
  {
    titre: 'Litiges',
    description: 'Traiter les signalements et les remboursements.',
  },
];

export function App() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 24px' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, color: colors.nuit }}>Comoov · Back-office</h1>
        <p style={{ color: colors.nuit, opacity: 0.7 }}>
          Console interne de modération et de validation des conducteurs.
        </p>
      </header>

      <section style={{ display: 'grid', gap: 16 }}>
        {modules.map((m) => (
          <article
            key={m.titre}
            style={{
              background: '#fff',
              border: `1px solid ${colors.brume}`,
              borderLeft: `4px solid ${colors.jauneSignal}`,
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: colors.nuit }}>
              {m.titre}
            </h2>
            <p style={{ margin: 0, color: colors.nuit, opacity: 0.7 }}>{m.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
