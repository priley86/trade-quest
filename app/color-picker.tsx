"use client";
import { useState } from "react";

export const profileColors = [
  ["red", "Red"],
  ["orange", "Orange"],
  ["yellow", "Yellow"],
  ["green", "Green"],
  ["blue", "Blue"],
  ["purple", "Purple"],
  ["pink", "Pink"],
] as const;

export function ColorPicker({
  name = "favoriteColor",
  value = "blue",
}: {
  name?: string;
  value?: string;
}) {
  const [selected, setSelected] = useState(value);
  return (
    <div className="color-picker" role="radiogroup" aria-label="Favorite color">
      <input type="hidden" name={name} value={selected} />
      {profileColors.map(([color, label]) => (
        <button
          key={color}
          type="button"
          className={`color-choice ${color} ${selected === color ? "selected" : ""}`}
          onClick={() => setSelected(color)}
          role="radio"
          aria-checked={selected === color}
          aria-label={label}
          title={label}
        >
          <span aria-hidden="true" />
          <b>{label}</b>
        </button>
      ))}
    </div>
  );
}
