import "server-only"

import { ImageResponse } from "next/og"

export const socialImageSize = {
  width: 1200,
  height: 630,
}

export const socialImageContentType = "image/png"

// Keep the social image self-contained: server functions do not necessarily
// have files from public/ on their runtime filesystem.
const iconData = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#252525"/><path d="M54 45h84v24c0 22-14 41-34 48v12h20v18H68v-18h20v-12c-20-7-34-26-34-48V45Zm16 18v6c0 15 12 27 26 27s26-12 26-27v-6H70Z" fill="#fff"/><path d="M54 58H38v12c0 18 13 33 30 36M138 58h16v12c0 18-13 33-30 36" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/></svg>`
const iconSrc = `data:image/svg+xml,${encodeURIComponent(iconData)}`

function truncate(value: string, maximumLength: number) {
  if (value.length <= maximumLength) return value
  return `${value.slice(0, maximumLength - 1).trimEnd()}…`
}

export function createSocialCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        color: "#252525",
        padding: "72px 80px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {/* ImageResponse requires a native image element for embedded data. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" width={88} height={88} />
        <span>CoLabs Games</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "980px",
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#737373",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {truncate(eyebrow, 48)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            letterSpacing: "-0.045em",
            lineHeight: 1.06,
          }}
        >
          {truncate(title, 100)}
        </div>
        <div
          style={{
            display: "flex",
            color: "#525252",
            fontSize: 30,
            lineHeight: 1.35,
          }}
        >
          {truncate(description, 180)}
        </div>
      </div>
    </div>,
    socialImageSize
  )
}
