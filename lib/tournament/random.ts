import { createHash, createHmac, randomBytes } from "node:crypto"

import type { SeededParticipant } from "./types"

export const RANDOMIZATION_ALGORITHM = "hmac-sha256-fisher-yates-v1"

class SeededRandom {
  private counter = 0
  private pool = Buffer.alloc(0)

  constructor(private readonly seed: Buffer) {}

  private nextUInt32(): number {
    if (this.pool.length < 4) {
      const counter = Buffer.allocUnsafe(8)
      counter.writeBigUInt64BE(BigInt(this.counter++))
      this.pool = Buffer.concat([
        this.pool,
        createHmac("sha256", this.seed).update(counter).digest(),
      ])
    }

    const value = this.pool.readUInt32BE(0)
    this.pool = this.pool.subarray(4)
    return value
  }

  integer(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error("Random bound must be a positive safe integer")
    }

    const range = 0x1_0000_0000
    const limit = range - (range % maxExclusive)
    let value = this.nextUInt32()
    while (value >= limit) value = this.nextUInt32()
    return value % maxExclusive
  }
}

export function shuffleWithSeed<T>(values: readonly T[], seed: string): T[] {
  const result = [...values]
  const random = new SeededRandom(Buffer.from(seed, "base64url"))

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.integer(index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

export function createRandomizedOrder(userIds: readonly string[]): {
  seed: string
  participants: SeededParticipant[]
  orderHash: string
} {
  const seed = randomBytes(32).toString("base64url")
  const ordered = shuffleWithSeed(userIds, seed)
  const participants = ordered.map((userId, index) => ({
    userId,
    seed: index + 1,
  }))
  const orderHash = createHash("sha256").update(ordered.join("\n")).digest("hex")

  return { seed, participants, orderHash }
}

