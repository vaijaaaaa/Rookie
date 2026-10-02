import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#22c55e",
          color: "#0b1a10",
          fontSize: 92,
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: -6,
        }}
      >
        {">_"}
      </div>
    ),
    size,
  );
}
