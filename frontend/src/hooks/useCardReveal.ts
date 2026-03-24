import { useEffect, useState } from "react";

export const useCardReveal = (loading: boolean, itemCount: number) => {
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    if (loading || itemCount === 0) {
      setCardsVisible(false);
      return;
    }

    const frame = globalThis.requestAnimationFrame(() => {
      setCardsVisible(true);
    });

    return () => globalThis.cancelAnimationFrame(frame);
  }, [loading, itemCount]);

  return cardsVisible;
};
