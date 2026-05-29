import { PageHeader, Panel } from '../../../../components/portal-ui';
import { requirePortalSession } from '../../../../lib/portal-session';

export default async function RealEstateImprovementsPage() {
  await requirePortalSession();

  return (
    <div className="page">
      <PageHeader
        title="Melhorias"
        description="Registro e acompanhamento de melhorias e iniciativas do portfólio imobiliário."
      />

      <Panel>
        <div className="signal-list">
          <article className="signal-item">
            <h3 className="signal-item__title">Módulo em construção</h3>
            <p>O registro de melhorias para imóveis estará disponível em breve.</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}
