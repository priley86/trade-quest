"use client";
import { useActionState, useEffect, useState } from "react";
import { updateProfile } from "./actions";
import { ColorPicker } from "../color-picker";
export function ProfileForm({
  firstName,
  lastName,
  contact,
  favoriteColor,
}: {
  firstName: string;
  lastName: string;
  contact: string;
  favoriteColor: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [selectedColor, setSelectedColor] = useState(favoriteColor);
  useEffect(() => {
    if (state.favoriteColor) {
      setSelectedColor(state.favoriteColor);
    }
  }, [state.favoriteColor]);
  return (
    <form
      action={action}
      className="stack-form"
      onSubmit={(event) => {
        const value = new FormData(event.currentTarget).get("favoriteColor");
        if (typeof value === "string") setSelectedColor(value);
      }}
    >
      <label>
        Favorite color
        <ColorPicker value={selectedColor} />
      </label>
      <label>
        Username (email or phone)
        <input
          name="contact"
          defaultValue={contact}
          required
          maxLength={254}
          autoComplete="username"
        />
      </label>
      <div className="two-fields">
        <label>
          First name
          <input
            name="firstName"
            defaultValue={firstName}
            required
            maxLength={80}
            autoComplete="given-name"
          />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            defaultValue={lastName}
            required
            maxLength={80}
            autoComplete="family-name"
          />
        </label>
      </div>
      <label>
        New password
        <input
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          placeholder="Leave blank to keep your current password"
        />
      </label>
      <button className="primary-button" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
      {state.message && (
        <p className="form-status" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
