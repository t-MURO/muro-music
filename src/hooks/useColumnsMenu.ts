import { useCallback, useState } from "react";

export const useColumnsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const toggleAt = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.bottom + 8 });
      setIsOpen((current) => !current);
    },
    []
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { closeMenu, isOpen, position, toggleAt };
};
