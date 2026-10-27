import type { ClosedReason, TicketEventType, TicketPriority, TicketStatus } from './ticket-rules';

/** A conversa como a aluna vê (sem notas internas): o que o servidor monta e a tela desenha. */
export type RequesterThread = {
  ticket: {
    id: string;
    number: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    topicId: string;
    situationId: string | null;
    dueAt: Date | null;
    closedReason: ClosedReason | null;
    rating: number | null;
    storePhase: number | null;
    emailReplies: boolean;
  };
  messages: { id: string; authorName: string; fromStaff: boolean; body: string; createdAt: Date }[];
  attachments: { id: string; messageId: string; fileName: string; mimeType: string; purgedAt: Date | null }[];
  events: {
    id: number;
    type: TicketEventType;
    fromValue: string | null;
    toValue: string | null;
    automatic: boolean;
    createdAt: Date;
    actorName: string | null;
    targetName: string | null;
  }[];
  staffReadAt: Date | null;
  lessonTitle: string | null;
};
