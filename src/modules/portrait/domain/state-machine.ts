import type { PortraitOrderStatus } from "./types";

const transitions: Record<PortraitOrderStatus, PortraitOrderStatus[]> = {
  draft: ["awaiting_source_image", "ready_to_generate", "cancelled"],
  awaiting_source_image: ["ready_to_generate", "cancelled", "failed"],
  ready_to_generate: ["generating", "cancelled", "failed"],
  generating: ["awaiting_internal_review", "failed", "cancelled"],
  awaiting_internal_review: [
    "generating",
    "preview_ready",
    "cancelled",
    "failed",
  ],
  preview_ready: [
    "awaiting_internal_review",
    "preview_sent",
    "awaiting_customer_selection",
    "cancelled",
    "failed",
  ],
  preview_sent: [
    "awaiting_customer_selection",
    "customer_selected",
    "cancelled",
  ],
  awaiting_customer_selection: [
    "customer_selected",
    "preview_ready",
    "cancelled",
  ],
  customer_selected: [
    "generating",
    "finalizing",
    "ready_to_deliver",
    "cancelled",
    "failed",
  ],
  finalizing: [
    "awaiting_internal_review",
    "ready_to_deliver",
    "failed",
    "cancelled",
  ],
  ready_to_deliver: ["completed", "finalizing", "failed", "cancelled"],
  completed: [],
  cancelled: [],
  failed: ["generating", "ready_to_generate", "cancelled"],
};

export function canTransitionOrder(
  from: PortraitOrderStatus,
  to: PortraitOrderStatus,
) {
  return from === to || transitions[from].includes(to);
}

export function assertOrderTransition(
  from: PortraitOrderStatus,
  to: PortraitOrderStatus,
) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`订单状态不允许从 ${from} 直接变更为 ${to}。`);
  }
}

