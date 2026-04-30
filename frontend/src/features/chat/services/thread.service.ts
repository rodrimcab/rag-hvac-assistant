import type { ChatThread } from "../types/thread.types";

/** Datos de ejemplo; sustituir por llamada HTTP cuando exista API. */
export function getMockThreads(reference: Date): ChatThread[] {
  const y = reference.getFullYear();
  const m = reference.getMonth();
  const d = reference.getDate();

  return [
    {
      id: "1",
      title: "Falla E6 compresor Midea",
      updatedAt: new Date(y, m, d, 9, 41),
    },
    {
      id: "2",
      title: "No enfría unidad interior",
      updatedAt: new Date(y, m, d, 8, 12),
    },
    {
      id: "3",
      title: "Ruido en ventilador exterior",
      updatedAt: new Date(y, m, d - 1, 18, 30),
    },
    {
      id: "4",
      title: "Pérdida de gas refrigerante",
      updatedAt: new Date(y, m, d - 2, 11, 0),
    },
  ];
}
