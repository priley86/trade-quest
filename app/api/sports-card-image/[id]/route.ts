import { NextResponse } from "next/server";

const fallback = "/sports-card.svg";

export async function GET(request: Request) {
  /*
  try {
    const response = await fetch(
      `https://api.cardsight.ai/v1/images/cards/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Api-Key": key,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.startsWith("image/")) {
      return new NextResponse(await response.arrayBuffer(), {
        headers: {
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Type": contentType,
        },
      });
    }

    if (response.ok && contentType.includes("json")) {
      const image = findImage(await response.json());
      if (image) return NextResponse.redirect(image);
    }

    return NextResponse.redirect(new URL(fallback, request.url));
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }
  */
  return NextResponse.redirect(new URL(fallback, request.url));
}
