import { BadRequestException } from '@nestjs/common';

/**
 * Centralized Status Transition Validator
 * 
 * This validator ensures consistent status transitions across the application.
 * All status changes should go through this validator to maintain data integrity.
 */
export class StatusTransitionValidator {
  /**
   * Allowed transitions for ProblemTicket (Service Order)
   */
  private static readonly TICKET_TRANSITIONS: Record<string, string[]> = {
    'OPEN': ['IN_DELIVERY', 'PENDING_APPROVAL', 'CANCELLED'],
    'PENDING_APPROVAL': ['APPROVED_ON_SITE', 'OPEN', 'CANCELLED'],
    'APPROVED_ON_SITE': ['IN_PROGRESS', 'CANCELLED'],
    'IN_DELIVERY': ['RECEIVED', 'CANCELLED'],
    'RECEIVED': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['RESOLVED', 'CANCELLED'],
    'RESOLVED': ['CLOSED'], // Flow baru: langsung ke CLOSED saat pickup dikonfirmasi
    'CLOSED': [], // Terminal state - no transitions allowed
    'CANCELLED': [], // Terminal state - no transitions allowed
  };

  /**
   * Allowed transitions for Cassette status
   */
  private static readonly CASSETTE_TRANSITIONS: Record<string, string[]> = {
    'OK': ['BAD', 'IN_TRANSIT_TO_RC'], // Can become BAD or be sent to RC
    'BAD': ['IN_TRANSIT_TO_RC'], // Can be sent to RC for repair
    'IN_TRANSIT_TO_RC': ['IN_REPAIR'], // Arrived at RC
    'IN_REPAIR': ['READY_FOR_PICKUP', 'SCRAPPED', 'OK'], // QC Passed (OK for on-site repair, READY_FOR_PICKUP for normal repair) or Failed (SCRAPPED)
    'READY_FOR_PICKUP': ['OK', 'IN_TRANSIT_TO_PENGELOLA'], // Picked up or shipped back
    'IN_TRANSIT_TO_PENGELOLA': ['OK'], // Received by Pengelola
    'SCRAPPED': [], // Terminal state - can only be replaced (new cassette created)
  };

  /**
   * Allowed transitions for RepairTicket
   */
  private static readonly REPAIR_TICKET_TRANSITIONS: Record<string, string[]> = {
    'RECEIVED': ['DIAGNOSING', 'ON_PROGRESS', 'COMPLETED', 'SCRAPPED'],
    'DIAGNOSING': ['ON_PROGRESS', 'COMPLETED', 'SCRAPPED'],
    'ON_PROGRESS': ['COMPLETED', 'SCRAPPED'],
    'COMPLETED': [], // Terminal state
    'SCRAPPED': [], // Terminal state
  };

  /**
   * Allowed transitions for PreventiveMaintenance
   */
  private static readonly PM_TRANSITIONS: Record<string, string[]> = {
    'SCHEDULED': ['IN_PROGRESS', 'CANCELLED', 'RESCHEDULED'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [], // Terminal state
    'CANCELLED': [], // Terminal state
    'RESCHEDULED': ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
  };

  /**
   * Check if a status transition is allowed for ProblemTicket
   */
  static canTransitionTicket(current: string, target: string, context?: {
    allRepairsCompleted?: boolean;
    hasDelivery?: boolean;
    hasReturn?: boolean;
    repairLocation?: 'ON_SITE' | 'AT_RC' | null;
  }): boolean {
    // Normal transition check
    const allowedTransitions = this.TICKET_TRANSITIONS[current];
    if (!allowedTransitions) {
      return false;
    }

    if (allowedTransitions.includes(target)) {
      // Additional context-based validations
      if (target === 'IN_DELIVERY' && !context?.hasDelivery) {
        return false; // Cannot transition to IN_DELIVERY without delivery
      }

      // PENDING_APPROVAL can only be set if repairLocation is ON_SITE
      if (target === 'PENDING_APPROVAL' && context?.repairLocation !== 'ON_SITE') {
        return false;
      }

      // APPROVED_ON_SITE can only be set if repairLocation is ON_SITE and current is PENDING_APPROVAL
      if (target === 'APPROVED_ON_SITE' && (context?.repairLocation !== 'ON_SITE' || current !== 'PENDING_APPROVAL')) {
        return false;
      }

      // IN_PROGRESS from APPROVED_ON_SITE doesn't need delivery
      if (target === 'IN_PROGRESS' && current === 'APPROVED_ON_SITE') {
        return true; // On-site repair doesn't need delivery
      }

      if (target === 'RESOLVED') {
        // Can transition to RESOLVED if:
        // 1. All repairs are completed (for multi-cassette tickets)
        // 2. Or single repair is completed
        return context?.allRepairsCompleted ?? true;
      }

      return true;
    }

    return false;
  }

  /**
   * Check if a status transition is allowed for Cassette
   */
  static canTransitionCassette(current: string, target: string, context?: {
    hasActiveTicket?: boolean;
    isReplacement?: boolean;
    qcPassed?: boolean;
  }): boolean {
    const allowedTransitions = this.CASSETTE_TRANSITIONS[current];
    if (!allowedTransitions) {
      return false;
    }

    if (allowedTransitions.includes(target)) {
      // Additional context-based validations
      if (target === 'IN_TRANSIT_TO_RC' && context?.hasActiveTicket) {
        return true; // Can send to RC if has active ticket
      }

      if (target === 'READY_FOR_PICKUP' && context?.qcPassed !== true) {
        return false; // Can only be READY_FOR_PICKUP if QC passed
      }

      if (target === 'OK' && current === 'IN_REPAIR' && context?.qcPassed !== true) {
        return false; // Can only transition from IN_REPAIR to OK if QC passed (for on-site repair)
      }

      if (target === 'SCRAPPED' && context?.qcPassed !== false) {
        // Can be SCRAPPED if QC failed, but also allow manual scrapping
        // (context.qcPassed === false means QC failed)
        return true;
      }

      if (target === 'OK' && current === 'SCRAPPED' && !context?.isReplacement) {
        return false; // SCRAPPED cassettes cannot become OK (only replacement creates new OK cassette)
      }

      return true;
    }

    return false;
  }

  /**
   * Check if a status transition is allowed for RepairTicket
   */
  static canTransitionRepairTicket(current: string, target: string, context?: {
    hasRepairAction?: boolean;
    qcPassed?: boolean;
  }): boolean {
    const allowedTransitions = this.REPAIR_TICKET_TRANSITIONS[current];
    if (!allowedTransitions) {
      return false;
    }

    if (allowedTransitions.includes(target)) {
      // Additional context-based validations
      if (target === 'COMPLETED' && context?.hasRepairAction !== true) {
        return false; // Cannot complete without repair action
      }

      if (target === 'SCRAPPED' && context?.qcPassed !== false) {
        // Can be SCRAPPED if QC failed, but also allow manual scrapping
        return true;
      }

      return true;
    }

    return false;
  }

  /**
   * Check if a status transition is allowed for PreventiveMaintenance
   */
  static canTransitionPM(current: string, target: string): boolean {
    const allowedTransitions = this.PM_TRANSITIONS[current];
    if (!allowedTransitions) {
      return false;
    }

    return allowedTransitions.includes(target);
  }

  /**
   * Validate and throw if transition is not allowed
   */
  static validateTicketTransition(current: string, target: string, context?: {
    allRepairsCompleted?: boolean;
    hasDelivery?: boolean;
    hasReturn?: boolean;
    repairLocation?: 'ON_SITE' | 'AT_RC' | null;
  }): void {
    if (!this.canTransitionTicket(current, target, context)) {
      throw new BadRequestException(
        `Cannot transition ticket from ${current} to ${target}. ` +
        `Allowed transitions from ${current}: ${this.TICKET_TRANSITIONS[current]?.join(', ') || 'none'}.`
      );
    }
  }

  /**
   * Validate and throw if transition is not allowed
   */
  static validateCassetteTransition(current: string, target: string, context?: {
    hasActiveTicket?: boolean;
    isReplacement?: boolean;
    qcPassed?: boolean;
  }): void {
    if (!this.canTransitionCassette(current, target, context)) {
      throw new BadRequestException(
        `Cannot transition cassette from ${current} to ${target}. ` +
        `Allowed transitions from ${current}: ${this.CASSETTE_TRANSITIONS[current]?.join(', ') || 'none'}.`
      );
    }
  }

  /**
   * Validate and throw if transition is not allowed
   */
  static validateRepairTicketTransition(current: string, target: string, context?: {
    hasRepairAction?: boolean;
    qcPassed?: boolean;
  }): void {
    if (!this.canTransitionRepairTicket(current, target, context)) {
      throw new BadRequestException(
        `Cannot transition repair ticket from ${current} to ${target}. ` +
        `Allowed transitions from ${current}: ${this.REPAIR_TICKET_TRANSITIONS[current]?.join(', ') || 'none'}.`
      );
    }
  }

  /**
   * Validate and throw if transition is not allowed
   */
  static validatePMTransition(current: string, target: string): void {
    if (!this.canTransitionPM(current, target)) {
      throw new BadRequestException(
        `Cannot transition PM from ${current} to ${target}. ` +
        `Allowed transitions from ${current}: ${this.PM_TRANSITIONS[current]?.join(', ') || 'none'}.`
      );
    }
  }

  /**
   * Get all allowed transitions for a given status
   */
  static getAllowedTransitions(type: 'ticket' | 'cassette' | 'repair' | 'pm', current: string): string[] {
    switch (type) {
      case 'ticket':
        return this.TICKET_TRANSITIONS[current] || [];
      case 'cassette':
        return this.CASSETTE_TRANSITIONS[current] || [];
      case 'repair':
        return this.REPAIR_TICKET_TRANSITIONS[current] || [];
      case 'pm':
        return this.PM_TRANSITIONS[current] || [];
      default:
        return [];
    }
  }
}

