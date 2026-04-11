import type { ChatMessage } from "../types/message.types";

const defaultAssistantIntro =
  "Según el manual técnico Midea para código **E6** (falla de compresor / protección del sistema):\n\n" +
  "1. Verificá alimentación estable en la unidad exterior.\n" +
  "2. Revisá presiones de refrigerante y posible falta de carga.\n" +
  "3. Comprobá conexiones del compresor y del módulo IPM.\n\n" +
  "Si el código persiste tras reset, se recomienda medición eléctrica del compresor.";

function at(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(y, m, d, h, min);
}

/** Mensajes de ejemplo por hilo; vacío si no hay plantilla. */
export function getMockMessagesForThread(threadId: string): ChatMessage[] {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  const day = new Date().getDate();

  const templates: Record<string, ChatMessage[]> = {
    "1": [
      {
        id: "m1-a1",
        role: "assistant",
        content: defaultAssistantIntro,
        createdAt: at(y, m, day, 9, 35),
      },
      {
        id: "m1-u1",
        role: "user",
        content: "El compresor arranca y a los pocos segundos corta con E6 otra vez.",
        createdAt: at(y, m, day, 9, 38),
      },
      {
        id: "m1-a2",
        role: "assistant",
        content:
          "En ese caso priorizá:\n\n" +
          "• Medir corriente del compresor al arranque.\n" +
          "• Revisar sensores de temperatura de descarga si el manual lo indica para E6.\n" +
          "• Confirmar que no haya bloqueo mecánico (ruido metálico al girar).\n\n" +
          "¿Tenés valores de presión con la unidad en frío y en calor?",
        createdAt: at(y, m, day, 9, 40),
      },
    ],
    "2": [
      {
        id: "m2-a1",
        role: "assistant",
        content:
          "Para **no enfría** en split inverter, el manual suele sugerir revisar filtro, flap, carga de gas y señal entre unidades. ¿Qué síntomas ves en la unidad interior (hielo, ruido, error en display)?",
        createdAt: at(y, m, day, 8, 5),
      },
      {
        id: "m2-u1",
        role: "user",
        content: "Sopla aire tibio, no hay código en el display.",
        createdAt: at(y, m, day, 8, 10),
      },
    ],
    "3": [
      {
        id: "m3-u1",
        role: "user",
        content: "Ruido de rodamiento en el ventilador del outdoor.",
        createdAt: at(y, m, day - 1, 18, 28),
      },
      {
        id: "m3-a1",
        role: "assistant",
        content:
          "Revisá en manual la sección de **ventilador exterior**: holgura del eje, fijación de aspas y lubricación si aplica. Si el ruido es constante al girar, suele ser rodamiento o desbalance.",
        createdAt: at(y, m, day - 1, 18, 29),
      },
    ],
    "4": [
      {
        id: "m4-a1",
        role: "assistant",
        content:
          "Ante **pérdida de gas**, el procedimiento general es localizar fuga (espuma, detector o nitrógeno según protocolo), reparar, vacío y recarga según especificación del fabricante.",
        createdAt: at(y, m, day - 2, 11, 0),
      },
    ],
  };

  return templates[threadId] ?? [];
}
