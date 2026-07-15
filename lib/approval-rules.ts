export function requiresApproval(amount: number, threshold?: number | null) {
  if (threshold === undefined || threshold === null) {
    return false;
  }

  return amount > threshold;
}

