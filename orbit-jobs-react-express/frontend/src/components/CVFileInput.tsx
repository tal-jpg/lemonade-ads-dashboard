/** Styled file picker (the reference "UPLOAD CV" pill) — replaces the ui.js enhancer. */
import { useState, type RefObject } from "react";

export function CVFileInput({ inputRef, hidden, label }: {
  inputRef: RefObject<HTMLInputElement | null>;
  hidden?: boolean;
  label?: string;
}) {
  const [name, setName] = useState("No file chosen");
  const [hasFile, setHasFile] = useState(false);
  return (
    <>
      <div className="fp" hidden={hidden}>
        <button type="button" className="fp-btn" onClick={() => inputRef.current?.click()}>{label || "Upload CV"}</button>
        <span className={"fp-name" + (hasFile ? " has-file" : "")}>{name}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="fp-native"
        hidden={hidden}
        onChange={(e) => {
          const f = e.target.files?.[0];
          setName(f ? f.name : "No file chosen");
          setHasFile(!!f);
        }}
      />
    </>
  );
}
