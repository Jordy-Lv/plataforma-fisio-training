import "server-only";

import net from "node:net";
import tls from "node:tls";

/**
 * Cliente SMTP mínimo, sin dependencias. Cubre lo justo para el aviso de
 * vencimiento: una conexión, un destinatario, un cuerpo de texto en español.
 *
 * El correo es un refuerzo del aviso que ya se ve en la aplicación: si no hay
 * `SMTP_URL`, `sendMail` no hace nada y quien llama sigue su curso. Si el envío
 * falla, lanza y el llamador lo registra como aviso no enviado.
 *
 * `SMTP_URL` admite:
 *   smtp://host:puerto              texto plano, sin autenticación (inbucket local)
 *   smtps://usuario:clave@host:465  TLS implícito con AUTH LOGIN
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

/** Remitente de los correos del sistema. Configurable por si el dominio cambia. */
const from = process.env.MAIL_FROM ?? "Fisio Training <avisos@fisio-training.local>";

/** `true` si hay un servidor SMTP configurado y el envío tiene sentido. */
export function isMailEnabled() {
  return Boolean(process.env.SMTP_URL);
}

export async function sendMail(mail: Mail): Promise<void> {
  const configured = process.env.SMTP_URL;
  if (!configured) return;

  const url = new URL(configured);
  const secure = url.protocol === "smtps:";
  const port = Number(url.port) || (secure ? 465 : 587);
  const host = url.hostname;

  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });
  socket.setEncoding("utf8");
  socket.setTimeout(10_000);

  const dialog = openDialog(socket);
  try {
    await dialog.connected();
    await dialog.expect(220);
    await dialog.send(`EHLO ${ehloName(host)}`, 250);

    if (url.username) {
      await dialog.send("AUTH LOGIN", 334);
      await dialog.send(b64(decodeURIComponent(url.username)), 334);
      await dialog.send(b64(decodeURIComponent(url.password)), 235);
    }

    await dialog.send(`MAIL FROM:<${address(from)}>`, 250);
    await dialog.send(`RCPT TO:<${mail.to}>`, 250);
    await dialog.send("DATA", 354);
    await dialog.send(`${buildMessage(mail)}\r\n.`, 250);
    await dialog.send("QUIT", 221).catch(() => {});
  } finally {
    socket.destroy();
  }
}

/** Un manejador de conversación SMTP sobre el socket: enviar línea, esperar código. */
function openDialog(socket: net.Socket) {
  let buffer = "";
  let pending:
    | { resolve: (code: number) => void; reject: (error: Error) => void; expected: number }
    | null = null;
  let ready = false;
  let onReady: (() => void) | null = null;
  let failure: Error | null = null;

  const settleReady = () => {
    ready = true;
    onReady?.();
  };
  socket.once("connect", settleReady);
  socket.once("secureConnect", settleReady);
  socket.on("timeout", () => socket.destroy(new Error("El servidor SMTP no respondió a tiempo.")));
  socket.on("error", (error) => {
    failure = error instanceof Error ? error : new Error(String(error));
    pending?.reject(failure);
    pending = null;
  });
  socket.on("close", () => {
    if (pending) {
      pending.reject(failure ?? new Error("El servidor SMTP cerró la conexión."));
      pending = null;
    }
  });
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i += 1) {
      // En una respuesta multilínea las intermedias llevan "250-"; la última,
      // "250 " con espacio. Solo esa cierra el turno.
      const match = /^(\d{3}) /.exec(lines[i]);
      if (!match) continue;
      buffer = lines.slice(i + 1).join("\n");
      const code = Number(match[1]);
      const waiter = pending;
      pending = null;
      if (!waiter) return;
      if (Math.floor(code / 100) === Math.floor(waiter.expected / 100)) {
        waiter.resolve(code);
      } else {
        waiter.reject(
          new Error(`El servidor SMTP respondió ${lines[i]} (se esperaba ${waiter.expected}).`),
        );
      }
      return;
    }
  });

  const wait = (expected: number) =>
    new Promise<number>((resolve, reject) => {
      if (failure) {
        reject(failure);
        return;
      }
      pending = { resolve, reject, expected };
    });

  return {
    connected: () =>
      ready
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            onReady = resolve;
          }),
    expect: wait,
    send: (line: string, expected: number) => {
      const answer = wait(expected);
      socket.write(`${line}\r\n`);
      return answer;
    },
  };
}

function buildMessage({ to, subject, text }: Mail) {
  const body = text.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
  return [
    `From: ${from}`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
}

/** Extrae la dirección de un `Nombre <correo@dominio>` o la devuelve tal cual. */
function address(value: string) {
  return /<([^>]+)>/.exec(value)?.[1] ?? value;
}

function ehloName(host: string) {
  return host === "127.0.0.1" || host === "::1" ? "localhost" : host;
}

function b64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}
