import { BadRequestException } from '@nestjs/common';

/**
 * Multi-Cassette Business Rules Validator
 * 
 * This validator enforces business rules for multi-cassette tickets.
 * Clarifies edge cases and ensures consistent behavior.
 */
export class MultiCassetteValidator {
  /**
   * Maximum number of cassettes allowed per ticket
   * Updated to 30 to support larger multi-cassette SOs.
   */
  static readonly MAX_CASSETTES_PER_TICKET = 30;

  /**
   * Minimum number of cassettes for multi-cassette ticket
   */
  static readonly MIN_CASSETTES_FOR_MULTI = 2;

  /**
   * Validate number of cassettes
   */
  static validateCassetteCount(count: number): void {
    if (count < 1) {
      throw new BadRequestException('At least one cassette is required');
    }

    if (count > this.MAX_CASSETTES_PER_TICKET) {
      throw new BadRequestException(
        `Maximum ${this.MAX_CASSETTES_PER_TICKET} cassettes allowed per ticket. ` +
        `Received ${count} cassettes.`
      );
    }
  }

  /**
   * Check if ticket is multi-cassette
   */
  static isMultiCassette(cassetteCount: number): boolean {
    return cassetteCount >= this.MIN_CASSETTES_FOR_MULTI;
  }

  /**
   * Business Rule: Can pickup be confirmed for multi-cassette ticket?
   * 
   * Rule: ALL cassettes must be in READY_FOR_PICKUP status OR SCRAPPED status.
   * - READY_FOR_PICKUP cassettes will be picked up (status → OK)
   * - SCRAPPED cassettes will remain at RC (status stays SCRAPPED)
   * - Partial pickup is NOT allowed (all must be ready or scrapped)
   */
  static canConfirmPickup(cassettes: Array<{ id: string; status: string; serialNumber: string }>): {
    canPickup: boolean;
    readyCount: number;
    scrappedCount: number;
    otherStatusCount: number;
    reason?: string;
  } {
    const readyCount = cassettes.filter(c => c.status === 'READY_FOR_PICKUP').length;
    const scrappedCount = cassettes.filter(c => c.status === 'SCRAPPED').length;
    const otherStatusCount = cassettes.length - readyCount - scrappedCount;

    // All cassettes must be either READY_FOR_PICKUP or SCRAPPED
    const canPickup = otherStatusCount === 0;

    if (!canPickup) {
      const otherStatuses = cassettes
        .filter(c => c.status !== 'READY_FOR_PICKUP' && c.status !== 'SCRAPPED')
        .map(c => `${c.serialNumber} (${c.status})`);

      return {
        canPickup: false,
        readyCount,
        scrappedCount,
        otherStatusCount,
        reason: `Cannot confirm pickup: ${otherStatusCount} cassette(s) are not ready: ${otherStatuses.join(', ')}. ` +
          `All cassettes must be in READY_FOR_PICKUP (for pickup) or SCRAPPED (for disposal) status.`
      };
    }

    return {
      canPickup: true,
      readyCount,
      scrappedCount,
      otherStatusCount: 0,
    };
  }

  /**
   * Business Rule: Can receive return for multi-cassette ticket?
   * 
   * Rule: ALL cassettes in IN_TRANSIT_TO_PENGELOLA status will be updated to OK.
   * - Only cassettes in IN_TRANSIT_TO_PENGELOLA are updated
   * - Other statuses (SCRAPPED, etc.) are ignored
   */
  static canReceiveReturn(cassettes: Array<{ id: string; status: string; serialNumber: string }>): {
    canReceive: boolean;
    inTransitCount: number;
    otherStatusCount: number;
    reason?: string;
  } {
    const inTransitCount = cassettes.filter(c => c.status === 'IN_TRANSIT_TO_PENGELOLA').length;
    const otherStatusCount = cassettes.length - inTransitCount;

    // At least one cassette must be in transit
    const canReceive = inTransitCount > 0;

    if (!canReceive) {
      return {
        canReceive: false,
        inTransitCount: 0,
        otherStatusCount,
        reason: `Cannot receive return: No cassettes in IN_TRANSIT_TO_PENGELOLA status. ` +
          `All cassettes are in other statuses.`
      };
    }

    return {
      canReceive: true,
      inTransitCount,
      otherStatusCount,
    };
  }

  /**
   * Business Rule: Get cassettes that should be updated for pickup
   * 
   * Returns cassettes that are in READY_FOR_PICKUP status (will be picked up)
   * SCRAPPED cassettes are excluded (they stay at RC)
   */
  static getCassettesForPickup(cassettes: Array<{ id: string; status: string; serialNumber: string }>): {
    toPickup: Array<{ id: string; status: string; serialNumber: string }>;
    toDispose: Array<{ id: string; status: string; serialNumber: string }>;
  } {
    const toPickup = cassettes.filter(c => c.status === 'READY_FOR_PICKUP');
    const toDispose = cassettes.filter(c => c.status === 'SCRAPPED');

    return { toPickup, toDispose };
  }

  /**
   * Business Rule: Get cassettes that should be updated for return receive
   * 
   * Returns cassettes that are in IN_TRANSIT_TO_PENGELOLA status
   */
  static getCassettesForReturnReceive(cassettes: Array<{ id: string; status: string; serialNumber: string }>): {
    toReceive: Array<{ id: string; status: string; serialNumber: string }>;
  } {
    const toReceive = cassettes.filter(c => c.status === 'IN_TRANSIT_TO_PENGELOLA');

    return { toReceive };
  }

  /**
   * Business Rule: Validate replacement request for multi-cassette ticket
   * 
   * Rule: Only SCRAPPED cassettes can request replacement.
   * If any cassette requests replacement, validate that:
   * 1. The cassette is SCRAPPED
   * 2. The cassette has not been replaced before (no replacementTicketId exists)
   * 3. A new cassette will be created (not updating old one)
   */
  static validateReplacementRequest(
    cassetteDetails: Array<{
      cassetteId: string;
      cassette: { id: string; status: string; serialNumber: string; replacementTicketId?: string | null };
      requestReplacement: boolean;
    }>
  ): void {
    const replacementRequests = cassetteDetails.filter(d => d.requestReplacement === true);

    for (const detail of replacementRequests) {
      if (detail.cassette.status !== 'SCRAPPED') {
        throw new BadRequestException(
          `Cassette ${detail.cassette.serialNumber} cannot request replacement. ` +
          `Only SCRAPPED cassettes can be replaced. Current status: ${detail.cassette.status}`
        );
      }

      // Check if cassette has already been replaced (has replacementTicketId)
      if (detail.cassette.replacementTicketId) {
        throw new BadRequestException(
          `Cassette ${detail.cassette.serialNumber} sudah pernah di-replace sebelumnya. ` +
          `Kaset yang sudah di-replace tidak dapat di-replace lagi. ` +
          `Replacement ticket ID: ${detail.cassette.replacementTicketId}`
        );
      }
    }
  }

  /**
   * Business Rule: Check if all repairs are completed for multi-cassette ticket
   * 
   * Rule: All cassettes must have COMPLETED repair tickets.
   * If any cassette doesn't have a completed repair, ticket cannot transition to RESOLVED.
   */
  static validateAllRepairsCompleted(
    cassettes: Array<{ id: string; serialNumber: string }>,
    repairTickets: Array<{ cassetteId: string; status: string }>
  ): {
    allCompleted: boolean;
    completedCount: number;
    pendingCount: number;
    missingRepairs: string[];
    reason?: string;
  } {
    const cassetteIds = new Set(cassettes.map(c => c.id));
    const latestRepairs = new Map<string, { status: string }>();

    // Get latest repair ticket per cassette
    for (const repair of repairTickets) {
      if (cassetteIds.has(repair.cassetteId)) {
        if (!latestRepairs.has(repair.cassetteId) || repair.status === 'COMPLETED') {
          latestRepairs.set(repair.cassetteId, { status: repair.status });
        }
      }
    }

    const completedCount = Array.from(latestRepairs.values()).filter(r => r.status === 'COMPLETED').length;
    const pendingCount = cassettes.length - completedCount;
    const missingRepairs = cassettes
      .filter(c => !latestRepairs.has(c.id) || latestRepairs.get(c.id)?.status !== 'COMPLETED')
      .map(c => c.serialNumber);

    const allCompleted = pendingCount === 0;

    if (!allCompleted) {
      return {
        allCompleted: false,
        completedCount,
        pendingCount,
        missingRepairs,
        reason: `Cannot transition to RESOLVED: ${pendingCount} cassette(s) do not have completed repairs. ` +
          `Missing or incomplete repairs for: ${missingRepairs.join(', ')}`
      };
    }

    return {
      allCompleted: true,
      completedCount,
      pendingCount: 0,
      missingRepairs: [],
    };
  }
}

