export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  new Notification(title, {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "sudoku-notification",
    silent: false,
  });
}
