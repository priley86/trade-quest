"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><section className="empty-state"><h1>A little bump in the trail</h1><p>We couldn’t load this page. Please try again, or ask your crew leader to check the game setup.</p><button className="primary-button" onClick={reset}>Try again</button></section></main>;
}
