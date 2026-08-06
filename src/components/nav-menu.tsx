import { type Easing, motion, type Transition } from "framer-motion"

const navItems = [
  {
    label: "Expertises",
    href: "/",
  },
  {
    label: "Work",
    href: "/about",
  },
  {
    label: "About",
    href: "/about",
  },
  {
    label: "Contact",
    href: "/contact",
  },
]

export default function NavDemo() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#faf4ec]">
      <nav className="flex items-center justify-center rounded-lg bg-white p-1">
        <ul className="flex min-h-10 items-center gap-1 md:gap-4">
          {navItems.map((item) => (
            <NavItem key={item.label} item={item} />
          ))}
        </ul>
      </nav>
    </div>
  )
}

const SPRING_CONFIG_TEXT = {
  type: "spring",
  stiffness: 320,
  damping: 32,
  mass: 1.3,
} as Transition

const EASE_CUBIC_CONFIG = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1] as Easing,
} as Transition

function NavItem({ item }: { item: (typeof navItems)[0] }) {
  return (
    <li className="text-xs font-semibold md:text-base">
      <motion.a
        href={item.href}
        className="relative block overflow-hidden rounded-md px-2 py-2"
        initial="initial"
        whileHover="hover"
        variants={{
          initial: {},
          hover: {},
        }}
      >
        <span className="relative text-transparent">{item.label}</span>

        <motion.span
          className="absolute inset-0 z-2 flex h-full w-full items-center justify-center"
          initial={{
            y: 0,
            scale: 1,
            rotate: 0,
          }}
          variants={{
            hover: {
              y: -100,
              scale: 0.5,
              rotate: -30,
            },
          }}
          transition={SPRING_CONFIG_TEXT}
        >
          {item.label}
        </motion.span>

        <motion.span
          className="absolute inset-0 z-1 h-full w-full scale-x-150 overflow-hidden bg-orange-500"
          initial={{
            y: 100,
            rotate: -40,
          }}
          variants={{
            hover: {
              y: 0,
              rotate: 0,
            },
          }}
          transition={EASE_CUBIC_CONFIG}
        >
          <motion.span
            className="absolute inset-0 h-full w-full bg-neutral-900"
            initial={{
              y: 150,
              rotate: -60,
            }}
            variants={{
              hover: {
                y: 0,
                rotate: 0,
              },
            }}
            transition={EASE_CUBIC_CONFIG}
          ></motion.span>
        </motion.span>

        <motion.span
          className="absolute inset-0 z-2 flex items-center justify-center text-white"
          initial={{
            y: 180,
            rotate: -60,
            scale: 0.5,
          }}
          variants={{
            hover: {
              y: 0,
              rotate: 0,
              scale: 1,
            },
          }}
          transition={SPRING_CONFIG_TEXT}
        >
          {item.label}
        </motion.span>
      </motion.a>
    </li>
  )
}
