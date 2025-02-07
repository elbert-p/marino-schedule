"use client"

import { useState, useEffect, useCallback } from "react"

export function useContainerWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0)

  const updateWidth = useCallback(() => {
    if (ref.current) {
      setWidth(ref.current.getBoundingClientRect().width)
    }
  }, [ref])

  useEffect(() => {
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [updateWidth])

  return width
}