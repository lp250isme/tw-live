// A single faint accent glow at the top of the canvas — Linear-style. No
// canvas, no particles, no grid (the data is the hero).
export default function AnimatedBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden
      style={{
        background:
          'radial-gradient(70% 45% at 50% -8%, color-mix(in srgb, var(--color-primary) 9%, transparent), transparent 72%)',
      }}
    />
  )
}
