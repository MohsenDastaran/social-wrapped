/** In-memory Telegram Desktop `result.json` for the getting-started demo. */

export const TELEGRAM_DEMO_FILE_NAME = "Demo · Telegram"

const OWNER = {
  userId: 1001,
  firstName: "Bruce",
  lastName: "Wayne",
  username: "demo_wrapped",
} as const

const OWNER_FROM = `${OWNER.firstName} ${OWNER.lastName}`
const OWNER_FROM_ID = `user${OWNER.userId}`

type Villain = {
  id: number
  name: string
  lines: string[]
}

const VILLAINS: Villain[] = [
  {
    id: 2001,
    name: "Darth Vader",
    lines: [
      "I find your lack of updates disturbing.",
      "The wrap is strong with this one.",
      "Join me, and together we can rank the galaxy.",
      "Impressive. Most impressive.",
      "You don't know the power of a yearly recap.",
    ],
  },
  {
    id: 2002,
    name: "Loki",
    lines: [
      "I am burdened with glorious purpose.",
      "A mischief of messages, as promised.",
      "Did you miss me, dear Wayne?",
      "Chaos is a ladder. Also a group chat.",
      "Love is a dagger. This chat is a novel.",
    ],
  },
  {
    id: 2003,
    name: "The Joker",
    lines: [
      "Why so serious?",
      "It's not about the money. It's about sending a message.",
      "Introduce a little anarchy.",
      "If you are good at something, never do it for free.",
      "This city deserves a better class of wrap.",
    ],
  },
  {
    id: 2004,
    name: "Lord Voldemort",
    lines: [
      "There is no good and evil. There is only power.",
      "Avada... actually, just send the file.",
      "I can teach you how to bottle fame.",
      "It is curious that you should wish to speak to me.",
      "Greatness inspires envy. Envy engenders spite.",
    ],
  },
  {
    id: 2005,
    name: "Thanos",
    lines: [
      "Perfectly balanced, as all things should be.",
      "I am inevitable.",
      "The hardest choices require the strongest wills.",
      "Fine. I will do it myself.",
      "You should have gone for the head. Or the heatmap.",
    ],
  },
  {
    id: 2006,
    name: "Magneto",
    lines: [
      "Peace was never an option.",
      "They will never accept us, Bruce.",
      "I have been at the mercy of men just following orders.",
      "We are the future.",
      "A gift can also be a curse.",
    ],
  },
  {
    id: 2007,
    name: "Cruella de Vil",
    lines: [
      "I live for furs. I worship furs.",
      "Dahling, that palette is criminal.",
      "If she doesn't have a fur coat, she doesn't go.",
      "Brilliant, brilliant, brilliant!",
      "I spotted a pattern. Quite literally.",
    ],
  },
  {
    id: 2008,
    name: "Agent Smith",
    lines: [
      "Welcome to the desert of the real.",
      "Never send a human to do a machine's job.",
      "This is the sound of inevitability.",
      "We're not here because we're free. We're here because we're not.",
      "Tell me, Mr. Wayne, what good is a wrap?",
    ],
  },
]

const OWNER_REPLIES = [
  "Noted. Gotham never sleeps either.",
  "I'll take that under advisement.",
  "The cave is analyzing it now.",
  "Ha. You would say that.",
  "Send the rest when you can.",
  "That's actually kind of fair.",
  "Coffee first. Villainy second.",
  "We should talk less at 3am.",
  "Deal. Next time, fewer riddles.",
  "The numbers don't lie.",
]

const EMOJIS = ["😂", "🔥", "👀", "🖤", "✨", "🦇", "😅", "🙌"]
const REACTION_EMOJIS = ["❤", "🔥", "😂", "👍", "🦇"]

type DemoMessage = {
  id: number
  type: "message"
  from: string
  from_id: string
  date: string
  text: string
  media_type?: string
  duration_seconds?: number
  reactions?: Array<{
    emoji: string
    count: number
    recent: Array<{ from: string; from_id: string }>
  }>
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function formatDate(year: number, month: number, day: number, hour: number, minute: number): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`
}

/** Tiny deterministic PRNG so the demo wrap is stable across clicks. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!
}

function buildChat(villain: Villain, chatIndex: number, nextId: () => number): DemoMessage[] {
  const rand = mulberry32(villain.id * 97 + 13)
  const volume = 28 + chatIndex * 9
  const messages: DemoMessage[] = []
  let year = 2025
  let month = 9
  let day = 4 + chatIndex
  let hour = (8 + chatIndex * 3) % 24
  let minute = (chatIndex * 11) % 60

  for (let i = 0; i < volume; i++) {
    minute += 7 + Math.floor(rand() * 18)
    if (minute >= 60) {
      hour += Math.floor(minute / 60)
      minute %= 60
    }
    if (hour >= 24) {
      hour %= 24
      day += 1
    }
    if (day > 28) {
      day = 1
      month += 1
    }
    if (month > 12) {
      month = 1
      year += 1
    }
    // Cluster late-night pings for a few villains so the clock chart has a peak.
    if (chatIndex % 3 === 0 && i % 5 === 0) {
      hour = 1 + Math.floor(rand() * 3)
    }

    const fromVillain = i % 3 !== 1
    const from = fromVillain ? villain.name : OWNER_FROM
    const fromId = fromVillain ? `user${villain.id}` : OWNER_FROM_ID
    const line = fromVillain
      ? pick(rand, villain.lines)
      : pick(rand, OWNER_REPLIES)
    const emoji = rand() > 0.72 ? ` ${pick(rand, EMOJIS)}` : ""

    const msg: DemoMessage = {
      id: nextId(),
      type: "message",
      from,
      from_id: fromId,
      date: formatDate(year, month, day, hour, minute),
      text: `${line}${emoji}`,
    }

    if (rand() > 0.92) {
      msg.media_type = "sticker"
      msg.text = ""
    } else if (rand() > 0.95) {
      msg.media_type = "voice_message"
      msg.duration_seconds = 4 + Math.floor(rand() * 18)
      msg.text = ""
    }

    if (rand() > 0.78) {
      const emojiReact = pick(rand, REACTION_EMOJIS)
      const reactorIsOwner = rand() > 0.4
      msg.reactions = [
        {
          emoji: emojiReact,
          count: 1,
          recent: [
            {
              from: reactorIsOwner ? OWNER_FROM : villain.name,
              from_id: reactorIsOwner ? OWNER_FROM_ID : `user${villain.id}`,
            },
          ],
        },
      ]
    }

    messages.push(msg)
  }

  return messages
}

export function buildTelegramDemoExport(): Record<string, unknown> {
  let messageId = 1
  const nextId = () => messageId++

  return {
    about: "Demo Telegram export for Social Wrapped. Names inspired by movie villains.",
    personal_information: {
      user_id: OWNER.userId,
      first_name: OWNER.firstName,
      last_name: OWNER.lastName,
      username: OWNER.username,
    },
    chats: {
      list: VILLAINS.map((villain, index) => ({
        type: "personal_chat",
        id: villain.id,
        name: villain.name,
        messages: buildChat(villain, index, nextId),
      })),
    },
  }
}

export function buildTelegramDemoFile(): File {
  const json = JSON.stringify(buildTelegramDemoExport())
  return new File([json], "result.json", { type: "application/json" })
}
