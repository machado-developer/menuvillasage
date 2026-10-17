import net from "node:net";
import tls from "node:tls";

const host = "pooled.db.prisma.io";
const port = 5432;
const user = "f3d60cb2b374459df503348f7f59946ed7f9345a47c7024f3d2333624bfd7734";
const database = "postgres";
const pass = "sk_RkKE0wm7nlWWWvNRhfFZb";

console.log(`A testar ligação e autenticação com ${host}:${port}...`);
const rawSocket = net.connect(port, host, () => {
  rawSocket.write(Buffer.from([0, 0, 0, 8, 0x04, 0xd2, 0x16, 0x2f]));
});

rawSocket.once("data", (data) => {
  if (data.toString("utf8") === "S") {
    const tlsSocket = tls.connect(
      {
        socket: rawSocket,
        servername: host,
        rejectUnauthorized: false,
      },
      () => {
        const str = `user\0${user}\0database\0${database}\0\0`;
        const len = 4 + 4 + Buffer.byteLength(str);
        const buf = Buffer.alloc(len);
        buf.writeInt32BE(len, 0);
        buf.writeInt32BE(196608, 4);
        buf.write(str, 8);
        tlsSocket.write(buf);
      }
    );

    tlsSocket.on("data", (chunk) => {
      console.log("Servidor enviou:", chunk.toString("utf8").replace(/[^\x20-\x7E]/g, "."));
      const msgType = String.fromCharCode(chunk[0]);
      if (msgType === "R") {
        const authType = chunk.readInt32BE(5);
        if (authType === 3) {
          console.log("Servidor pediu CleartextPassword. A enviar password...");
          const passBuf = Buffer.alloc(1 + 4 + Buffer.byteLength(pass) + 1);
          passBuf[0] = 0x70; // 'p'
          passBuf.writeInt32BE(4 + Buffer.byteLength(pass) + 1, 1);
          passBuf.write(pass + "\0", 5);
          tlsSocket.write(passBuf);
        }
      } else if (msgType === "E") {
        console.error("❌ Servidor devolveu erro:", chunk.toString("utf8"));
        tlsSocket.destroy();
      } else if (msgType === "Z") {
        console.log("✅ ReadyForQuery! Autenticado com sucesso!");
        tlsSocket.destroy();
      }
    });

    tlsSocket.on("error", (err) => console.error("TLS error:", err));
  }
});
