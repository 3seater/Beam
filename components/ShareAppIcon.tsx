/** Recognizable app marks inside the receipt's frosted share tiles. */
export function ShareAppIcon({ app }: { app: 'messages' | 'x' | 'whatsapp' | 'telegram' }) {
  if (app === 'messages') return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#34C759" />
    <path fill="white" d="M14 5.5c-5.25 0-9.5 3.45-9.5 7.7 0 2.7 1.72 5.08 4.32 6.45l-.76 3.05 3.68-2.05c.73.16 1.49.24 2.26.24 5.25 0 9.5-3.45 9.5-7.69S19.25 5.5 14 5.5Z" />
  </svg>;
  if (app === 'x') return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill="#14171A" />
    <path fill="white" d="M19.44 6h2.7l-5.9 6.74L23.18 22h-5.43l-4.25-5.56L8.63 22h-2.7l6.3-7.2L5.56 6h5.57l3.84 5.08L19.44 6Zm-.94 14.37h1.5L10.33 7.54H8.72L18.5 20.37Z" />
  </svg>;
  if (app === 'telegram') return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="14" fill="#229ED9" />
    <path fill="white" d="m6.14 13.48 14.1-5.44c.65-.24 1.22.16 1.01 1.14l-2.4 11.29c-.18.8-.65.99-1.32.61l-3.65-2.69-1.76 1.7c-.2.2-.37.37-.75.37l.26-3.72 6.77-6.11c.29-.26-.06-.41-.45-.15l-8.37 5.27-3.61-1.13c-.79-.25-.8-.79.17-1.14Z" />
  </svg>;
  return <span className="share-whatsapp-icon" aria-hidden="true"><span /></span>;
}
