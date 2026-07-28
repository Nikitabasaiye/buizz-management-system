"use client";

import { useCallback, useState } from "react";
import { toastUtils } from "@/utils/toast";

type ActionCallback = () => void | Promise<void>;

export function useActionFeedback() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const runAction = useCallback(
    async (
      actionKey: string,
      callback: ActionCallback,
      successText = "Saved successfully",
      closeModal?: () => void
    ) => {
      setLoadingKey(actionKey);
      setSuccessMessage("");
      setErrorMessage("");

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        await callback();
        setSuccessMessage(successText);
        toastUtils.success(successText);
        closeModal?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Action failed. Try again.";
        setErrorMessage(message);
        toastUtils.error(message);
      } finally {
        setLoadingKey(null);
      }
    },
    []
  );

  return { loadingKey, successMessage, errorMessage, runAction };
}
