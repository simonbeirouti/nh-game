import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const socialImageSize = {
  width: 1200,
  height: 630,
}

export const socialImageContentType = "image/png"

const iconData = await readFile(
  join(process.cwd(), "public/icon-512.svg"),
  "utf8"
)
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
