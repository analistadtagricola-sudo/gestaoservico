import { Implemento, OrdemServico, Cliente, PlanoRevisao } from "../types";

export interface RevisionAlert {
  id: string;
  implemento: Implemento;
  clienteName: string;
  revisao: PlanoRevisao;
  currentHorimetro: number;
  horasFaltantes: number; // <=0 means overdue/atrasada
  status: "ATRASADA" | "PROXIMA";
}

export function getRevisionAlerts(
  implementos: Implemento[],
  ordens: OrdemServico[],
  clientes: Cliente[]
): RevisionAlert[] {
  const alerts: RevisionAlert[] = [];
  const clientesMap = new Map(clientes.map(c => [c.id, c.razao_social || c.nome_fantasia || "Cliente"]));

  // Load all revisions from localStorage
  const allRevisoesRaw = typeof window !== "undefined" ? localStorage.getItem("gst_revisoes") : null;
  const allRevisoesList: PlanoRevisao[] = allRevisoesRaw ? JSON.parse(allRevisoesRaw) : [];

  for (const impl of implementos) {
    if (!impl.plano_id) continue;

    // Get revisions for this plan
    const planRevs = allRevisoesList.filter(r => r.id_plano === impl.plano_id).sort((a, b) => a.revisao_numero - b.revisao_numero);
    if (planRevs.length === 0) continue;

    const relatedOS = ordens.filter(o => o.implemento_id === impl.id);
    const finishedOS = relatedOS.filter(o => o.status === "FINALIZADA");

    const osMaxHorimetro = relatedOS.reduce((max, o) => Math.max(max, Number(o.horimetro_final) || Number(o.horimetro) || 0), 0);
    const currentHorimetro = Math.max(Number(impl.horimetro_atual) || 0, osMaxHorimetro);

    for (const rev of planRevs) {
      // Check if finished
      const matchingOS = finishedOS.find(o => {
        const revExec = (o.revisao_executada || "").toLowerCase().replace(/\s+/g, "");
        const descMatch = (o.revisao_executada || "").toLowerCase().includes(rev.descricao.toLowerCase());
        const matchH = revExec.includes(`${rev.horas_limite}h`) || revExec === `${rev.horas_limite}` || revExec.includes(`revisãode${rev.horas_limite}`);
        return matchH || descMatch;
      });

      if (!matchingOS) {
        if (currentHorimetro >= rev.horas_limite) {
          // ATRASADA / PENDENTE
          alerts.push({
            id: `${impl.id}_${rev.id_revisao || rev.horas_limite}`,
            implemento: impl,
            clienteName: clientesMap.get(impl.cliente_id) || "Cliente Não Informado",
            revisao: rev,
            currentHorimetro,
            horasFaltantes: rev.horas_limite - currentHorimetro,
            status: "ATRASADA"
          });
        } else if (rev.horas_limite - currentHorimetro <= 50) {
          // PRÓXIMA
          alerts.push({
            id: `${impl.id}_${rev.id_revisao || rev.horas_limite}`,
            implemento: impl,
            clienteName: clientesMap.get(impl.cliente_id) || "Cliente Não Informado",
            revisao: rev,
            currentHorimetro,
            horasFaltantes: rev.horas_limite - currentHorimetro,
            status: "PROXIMA"
          });
        }
      }
    }
  }

  // Sort: ATRASADA first (most overdue), then PROXIMA (closest to limit)
  return alerts.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "ATRASADA" ? -1 : 1;
    }
    return a.horasFaltantes - b.horasFaltantes;
  });
}
