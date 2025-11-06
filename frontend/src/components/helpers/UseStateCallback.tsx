import { useState, useRef, useEffect } from "react"

// Work around React useState being async
export function useStateCallback<T>(intialState: T):
[T, (state: T, cb?: (state: T) => void) => void] {
  const [state, setState] = useState<T>(intialState)
  const cbRef = useRef<null | ((state: T) => void) >(null)
  
  const setStateCallback = (state: T, cb?: (state: T) => void) => {
    cbRef.current = cb ?? null
    setState(state)
  }

  useEffect(() => {
    if (cbRef.current) {
      cbRef.current(state)
      cbRef.current = null
    }
  }, [state]);

  return [state, setStateCallback];
}