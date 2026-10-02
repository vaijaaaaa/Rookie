"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Cryptographically random, unambiguous password. */
export function generatePassword(length = 14) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Password input with show/hide, generate and copy. */
export function PasswordField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the password is visible to copy manually
    }
  }

  return (
    <div className="flex gap-1.5">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        minLength={8}
        required
        className="font-mono"
      />
      <Button type="button" variant="outline" size="icon" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff /> : <Eye />}
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => onChange(generatePassword())} aria-label="Generate password">
        <RefreshCw />
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={copy} disabled={!value} aria-label="Copy password">
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
