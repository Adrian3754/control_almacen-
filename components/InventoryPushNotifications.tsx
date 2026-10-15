"use client";

import { useCallback, useEffect, useState } from "react";
import {
  removeInventoryPushSubscriptionAction,
  saveInventoryPushSubscriptionAction,
} from "@/components/actions/inventario-materiales.actions";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function decodeVapidPublicKey(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function getSubscriptionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo configurar la notificación en este dispositivo.";
}

export default function InventoryPushNotifications() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const syncSubscription = useCallback(async (subscription: PushSubscription) => {
    await saveInventoryPushSubscriptionAction(subscription.toJSON());
    setSubscribed(true);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }
    let active = true;
    const syncExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (active) setSupported(true);
        const subscription = await registration.pushManager.getSubscription();
        if (!active || !subscription) return;
        await syncSubscription(subscription);
      } catch (syncError: unknown) {
        if (active) setError(getSubscriptionError(syncError));
      }
    };

    void syncExistingSubscription();
    return () => {
      active = false;
    };
  }, [syncSubscription]);

  async function enableNotifications() {
    if (!vapidPublicKey) {
      setError("Las notificaciones push todavía no están configuradas en el servidor.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          permission === "denied"
            ? "El permiso está bloqueado. Actívalo desde los ajustes de notificaciones del navegador."
            : "No se concedió el permiso para enviar notificaciones."
        );
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ??
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(vapidPublicKey),
        });
      await syncSubscription(subscription);
      setMessage("Este dispositivo recibirá avisos de reabastecimiento y requisiciones pendientes.");
    } catch (subscribeError: unknown) {
      setError(getSubscriptionError(subscribeError));
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeInventoryPushSubscriptionAction(subscription.endpoint);
        const unsubscribed = await subscription.unsubscribe();
        if (!unsubscribed) {
          throw new Error("El navegador no pudo cancelar la suscripción de notificaciones.");
        }
      }
      setSubscribed(false);
      setMessage("Las notificaciones quedaron desactivadas en este dispositivo.");
    } catch (unsubscribeError: unknown) {
      setError(getSubscriptionError(unsubscribeError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl" aria-hidden="true">
            🔔
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900">Avisos en este dispositivo</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                subscribed
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {subscribed ? "Activados" : "Desactivados"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Recibe avisos de existencias bajas y recordatorios diarios de requisiciones pendientes, incluso si no tienes abierta la página.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              En iPhone/iPad (iOS/iPadOS 16.4+), agrega la aplicación a la pantalla de inicio y ábrela desde su icono.
            </p>
            {!supported ? (
              <p className="mt-2 text-xs text-rose-700">
                Este navegador no admite notificaciones push. En iPhone se necesita iOS 16.4 o posterior.
              </p>
            ) : null}
            {supported && !vapidPublicKey ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                El servidor todavía no tiene configuradas las claves para enviar notificaciones push.
              </p>
            ) : null}
            {error ? <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}
            {message ? <p role="status" className="mt-2 text-xs font-medium text-emerald-800">{message}</p> : null}
          </div>
        </div>
        {supported && vapidPublicKey ? (
          subscribed ? (
            <button
              type="button"
              onClick={() => void disableNotifications()}
              disabled={busy}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Guardando..." : "Desactivar avisos"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void enableNotifications()}
              disabled={busy}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Activando..." : "Activar notificaciones"}
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
