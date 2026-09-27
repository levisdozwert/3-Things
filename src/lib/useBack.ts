import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Back to wherever the user came from, or to `fallback` when they arrived here directly. */
export function useBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key === "default") navigate(fallback, { viewTransition: true });
    else navigate(-1);
  }, [navigate, location.key, fallback]);
}
