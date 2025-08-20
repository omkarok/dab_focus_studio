// Placeholder utilities for accessibility and usability.
// TODO: improve keyboard navigation and screen reader support.

export type FontSize = "sm" | "md" | "lg";

let currentFontSize: FontSize = "md";

export function setFontSize(size: FontSize) {
  currentFontSize = size;
  if (typeof document !== "undefined") {
    document.documentElement.style.fontSize = size === "sm" ? "14px" : size === "lg" ? "18px" : "16px";
  }
}

export function getFontSize(): FontSize {
  return currentFontSize;
}
