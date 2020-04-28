
export function randomElement<T>(xs: T[]): T {
    const index = Math.floor(Math.random() * xs.length);
    return xs[index];
}

/** 
 * @param probability expected to be in range [0, 1). 
 * @return whether the event represented by the probability occurred.
 */
export function simulateProbability(probability: number): boolean {
    return Math.random() <= probability;
}