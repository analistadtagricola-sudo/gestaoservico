/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Calendar, Clock, User, Tractor, AlertCircle, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { OrdemServico, Tecnico } from "../types";

interface AgendaViewProps {
  ordens: OrdemServico[];
  tecnicos: Tecnico[];
  onNavigate: (view: string, targetId?: number) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  ordens,
  tecnicos,
  onNavigate
}) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Generate week dates based on offset
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    
    // Set to Monday of current week plus offset
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (currentWeekOffset * 7);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(startOfWeek);
      nextDate.setDate(startOfWeek.getDate() + i);
      dates.push(nextDate);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const formatWeekRangeLabel = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("pt-BR", options)} — ${end.toLocaleDateString("pt-BR", options)} (${start.getFullYear()})`;
  };

  // Find assignments for a specific technician on a specific date
  const getAssignments = (techId: number, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return ordens.filter(o => {
      const oDate = o.data_atendimento ? o.data_atendimento.substring(0, 10) : "";
      return (
        (o.tecnico_id === techId || o.auxiliar_id === techId) &&
        oDate === dateStr &&
        o.status !== "CANCELADA"
      );
    });
  };

  return (
    <div className="space-y-6 text-xs animate-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
            Agenda de Campo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Programação integrada semanal de atendimentos e rotas de deslocamento de técnicos.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm font-semibold">
          <button 
            onClick={() => setCurrentWeekOffset(prev => prev - 1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-xs text-gray-700 font-bold tracking-tight">
            {formatWeekRangeLabel()}
          </span>
          <button 
            onClick={() => setCurrentWeekOffset(prev => prev + 1)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentWeekOffset(0)}
            className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 ml-2"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Technicians Scheduler Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Weekly Header Row */}
        <div className="grid grid-cols-1 md:grid-cols-8 border-b border-gray-150 bg-gray-50 text-center font-bold">
          <div className="p-3 border-r border-gray-150 text-left text-gray-500 font-extrabold flex items-center gap-2">
            <User className="w-4 h-4" /> Técnicos
          </div>
          {weekDates.map((date, idx) => {
            const isToday = new Date().toDateString() === date.toDateString();
            const daysLabel = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
            return (
              <div 
                key={idx} 
                className={`p-3 border-r border-gray-150 last:border-r-0 flex flex-col items-center justify-center ${
                  isToday ? "bg-red-50 text-brand-red ring-1 ring-brand-red/10" : "text-gray-600"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider">{daysLabel[date.getDay()]}</span>
                <span className="font-display text-lg font-extrabold mt-0.5">{date.getDate()}</span>
              </div>
            );
          })}
        </div>

        {/* Technician Rows */}
        <div className="divide-y divide-gray-150">
          {tecnicos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nenhum técnico cadastrado.</div>
          ) : (
            tecnicos.map(tech => (
              <div key={tech.id} className="grid grid-cols-1 md:grid-cols-8 hover:bg-gray-50/20 transition-colors">
                {/* Tech Profile Column */}
                <div className="p-4 border-r border-gray-150 bg-gray-50/50 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{tech.apelido}</h3>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">{tech.cargo || "TÉCNICO"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tech.cor_agenda || "#2563eb" }} />
                    <span className="text-[10px] text-gray-500 font-semibold">{tech.telefone || "Sem telefone"}</span>
                  </div>
                </div>

                {/* Week Days blocks */}
                {weekDates.map((date, idx) => {
                  const assignments = getAssignments(tech.id!, date);
                  const isToday = new Date().toDateString() === date.toDateString();
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-2 border-r border-gray-150 last:border-r-0 min-h-[110px] space-y-1.5 flex flex-col justify-start relative ${
                        isToday ? "bg-red-50/10" : ""
                      }`}
                    >
                      {assignments.length === 0 ? (
                        <div className="text-[10px] text-gray-300 italic text-center my-auto">Livre</div>
                      ) : (
                        assignments.map(os => {
                          const statusColors: Record<string, string> = {
                            ABERTA: "border-amber-500 bg-amber-50/50 text-amber-900",
                            "EM ATENDIMENTO": "border-blue-500 bg-blue-50/50 text-blue-900",
                            AGENDADA: "border-orange-500 bg-orange-50/50 text-orange-900",
                            AGUARDANDO: "border-purple-500 bg-purple-50/50 text-purple-900",
                            FINALIZADA: "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                          };

                          return (
                            <div
                              key={os.id}
                              onClick={() => onNavigate("os", os.id)}
                              className={`p-1.5 border-l-[3px] rounded-r-md border-y border-r shadow-xs text-left cursor-pointer hover:-translate-y-0.5 transition-all text-[10px] leading-snug font-semibold ${
                                statusColors[os.status] || "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="font-bold flex justify-between gap-1 items-center">
                                <span>{os.numero_os}</span>
                                {os.hora_inicial && (
                                  <span className="text-[8px] font-mono opacity-60 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {os.hora_inicial}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] mt-0.5 truncate uppercase" title={os.clientes?.razao_social}>
                                {os.clientes?.razao_social}
                              </div>
                              <div className="text-[8px] opacity-75 truncate" title={os.implementos?.modelo}>
                                {os.implementos?.modelo}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
