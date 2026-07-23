import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { OrdemServico, Tecnico } from '../types';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.warn('Login cancelado: a janela do Google foi fechada pelo usuário.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

const getNextDayYMD = (ymdStr: string): string => {
  const [year, month, day] = ymdStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
};

const sanitizeTime = (timeStr: string): string => {
  if (!timeStr) return "08:00:00";
  const clean = timeStr.trim();
  const parts = clean.split(":");
  const h = (parts[0] || "08").padStart(2, "0");
  const m = (parts[1] || "00").padStart(2, "0");
  const s = (parts[2] || "00").padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const syncOrdensToGoogleCalendar = async (
  ordens: OrdemServico[], 
  tecnicos: Tecnico[],
  calendarId: string = "4137d378d82534aab0188a7fb19b3af014c90cb065562122f77f5052b4bbf3b7@group.calendar.google.com"
): Promise<{success: number, errors: number, lastError?: string}> => {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado no Google.");

  let successCount = 0;
  let errorCount = 0;
  let lastErrorMessage = "";

  for (const os of ordens) {
    if (!os.data_atendimento && !os.data_abertura) continue;
    if (os.status === "CANCELADA") continue;

    const dateStr = String(os.data_atendimento || os.data_abertura).trim();
    if (!dateStr || dateStr.length < 10) continue;

    // Normalizing date to YYYY-MM-DD
    let ymd = "";
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      ymd = dateStr.substring(0, 10);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
      const parts = dateStr.split("/");
      ymd = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    } else {
      continue;
    }

    const tech = tecnicos.find(t => t.id === os.tecnico_id);
    const techName = tech ? (tech.apelido || tech.nome).toUpperCase() : "SEM TÉCNICO";

    const aux = tecnicos.find(t => t.id === os.auxiliar_id);
    const auxName = aux ? (aux.apelido || aux.nome).toUpperCase() : "NENHUM";

    const clienteName = (os.clientes?.razao_social || os.clientes?.nome_fantasia || "CLIENTE NÃO INFORMADO").toUpperCase();
    const tipoAtendimento = (os.tipo_atendimento || "ATENDIMENTO").toUpperCase();
    
    // Equipamento e Série
    const modeloEquip = os.implementos?.modelo || "";
    const fabEquip = os.implementos?.fabricante || "";
    const equipamento = (modeloEquip ? `${fabEquip ? fabEquip + ' ' : ''}${modeloEquip}` : "NÃO INFORMADO").toUpperCase();
    const serie = (os.implementos?.numero_serie || "SN").toUpperCase();

    // Localização
    const endParts = [
      os.clientes?.endereco,
      os.clientes?.numero,
      os.clientes?.bairro,
      os.clientes?.cidade && os.clientes?.uf ? `${os.clientes.cidade} - ${os.clientes.uf}` : os.clientes?.cidade
    ].filter(Boolean);
    const localizacao = endParts.length > 0 ? endParts.join(", ").toUpperCase() : "NÃO INFORMADA";

    const reclamacao = os.reclamacao || "NENHUMA";

    const title = `${techName} • ${os.numero_os} • ${clienteName} • ${tipoAtendimento}`;

    const description = `📋 TIPO DE ATENDIMENTO
${tipoAtendimento}

📍 LOCALIZAÇÃO
${localizacao}

🚜 EQUIPAMENTO
${equipamento}

🔢 SÉRIE
${serie}

👨🔧 TÉCNICO RESPONSÁVEL
${techName}

👨🔧 AUXILIAR
${auxName}

🛠 RECLAMAÇÃO
${reclamacao}`;

    const startObj: any = {};
    const endObj: any = {};

    if (os.hora_inicial && os.hora_inicial.trim() !== "") {
      const startTime = sanitizeTime(os.hora_inicial);
      let endTime = os.hora_final ? sanitizeTime(os.hora_final) : "18:00:00";

      if (endTime <= startTime) {
        const [h, m] = startTime.split(":").map(Number);
        const endH = Math.min(h + 2, 23);
        endTime = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      }

      startObj.dateTime = `${ymd}T${startTime}-03:00`;
      startObj.timeZone = "America/Sao_Paulo";

      endObj.dateTime = `${ymd}T${endTime}-03:00`;
      endObj.timeZone = "America/Sao_Paulo";
    } else {
      startObj.date = ymd;
      endObj.date = getNextDayYMD(ymd);
    }

    const event = {
      summary: title,
      description: description,
      location: localizacao,
      start: startObj,
      end: endObj
    };

    const sendRequest = async (targetCalId: string) => {
      return await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalId)}/events`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });
    };

    try {
      let response = await sendRequest(calendarId);

      // Fallback to primary if shared calendar is forbidden/not found
      if (!response.ok && (response.status === 404 || response.status === 403 || response.status === 400) && calendarId !== "primary") {
        console.warn(`Tentativa na agenda secundária falhou (${response.status}). Tentando salvar na agenda principal...`);
        const primaryResp = await sendRequest("primary");
        if (primaryResp.ok) {
          response = primaryResp;
        }
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        lastErrorMessage = errJson?.error?.message || `HTTP ${response.status}`;
        console.error("Falha ao criar evento no Google Calendar:", response.status, errJson);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (e: any) {
      console.error("Erro de rede ao criar evento:", e);
      lastErrorMessage = e.message || "Erro de conexão";
      errorCount++;
    }
  }

  return { success: successCount, errors: errorCount, lastError: lastErrorMessage };
};

export const formatOSNotificationText = (
  os: Partial<OrdemServico>,
  tecnicos: Tecnico[],
  clienteOverride?: any,
  implementoOverride?: any
): string => {
  const tech = tecnicos.find(t => t.id === os.tecnico_id);
  const techName = tech ? (tech.apelido || tech.nome).toUpperCase() : "SEM TÉCNICO";

  const aux = tecnicos.find(t => t.id === os.auxiliar_id);
  const auxName = aux ? (aux.apelido || aux.nome).toUpperCase() : "NENHUM";

  const clienteObj = os.clientes || clienteOverride;
  const clienteName = (clienteObj?.razao_social || clienteObj?.nome_fantasia || "CLIENTE NÃO INFORMADO").toUpperCase();
  const tipoAtendimento = (os.tipo_atendimento || "ATENDIMENTO").toUpperCase();

  const implObj = os.implementos || implementoOverride;
  const modeloEquip = implObj?.modelo || "";
  const fabEquip = implObj?.fabricante || "";
  const equipamento = (modeloEquip ? `${fabEquip ? fabEquip + ' ' : ''}${modeloEquip}` : "NÃO INFORMADO").toUpperCase();
  const serie = (implObj?.numero_serie || "S/N").toUpperCase();

  const endParts = [
    clienteObj?.endereco,
    clienteObj?.numero,
    clienteObj?.bairro,
    clienteObj?.cidade && clienteObj?.uf ? `${clienteObj.cidade} - ${clienteObj.uf}` : clienteObj?.cidade
  ].filter(Boolean);
  const localizacao = endParts.length > 0 ? endParts.join(", ").toUpperCase() : "NÃO INFORMADA";

  const reclamacao = os.reclamacao || "NENHUMA";
  const numOS = os.numero_os || "PENDENTE";

  const dataAtend = os.data_atendimento || os.data_abertura || "A DEFINIR";
  const horAtend = os.hora_inicial ? ` ÀS ${os.hora_inicial}` : "";
  const dataTerm = os.data_termino && os.data_termino !== os.data_atendimento ? ` ATÉ ${os.data_termino}` : "";

  return `*AGENDAMENTO DE O.S.* 🚜
*${techName} • ${numOS} • ${clienteName} • ${tipoAtendimento}*

📋 *TIPO DE ATENDIMENTO*
${tipoAtendimento}

👤 *CLIENTE*
${clienteName}

📅 *DATA & HORÁRIO*
${dataAtend}${horAtend}${dataTerm}

📍 *LOCALIZAÇÃO*
${localizacao}

🚜 *EQUIPAMENTO*
${equipamento}

🔢 *SÉRIE*
${serie}

👨‍🔧 *TÉCNICO RESPONSÁVEL*
${techName}

👨‍🔧 *AUXILIAR*
${auxName}

🛠 *RECLAMAÇÃO / SOLICITAÇÃO*
${reclamacao}

_Bom trabalho!_`;
};

