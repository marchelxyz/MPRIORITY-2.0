'use client'

export default function TeleagentLogo() {
  return (
    <div className="flex items-center">
      <a
        href="https://teleagent.ru"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center hover:opacity-80 transition-opacity"
        title="Teleagent"
      >
        <img
          src="/teleagent-logo.svg"
          alt="Teleagent Logo"
          className="h-6 w-auto"
        />
      </a>
    </div>
  )
}
