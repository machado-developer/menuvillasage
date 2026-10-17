import net from "node:net";
import tls from "node:tls";

const host = "pooled.db.prisma.io";
const port = 5432;

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
        const cert = tlsSocket.getPeerCertificate(true);
        console.log("Cert Subject:", cert.subject);
        console.log("Cert Issuer:", cert.issuer);
        console.log("Valid From:", cert.valid_from);
        console.log("Valid To:", cert.valid_to);
        console.log("SAN:", cert.subjectaltname);
        tlsSocket.destroy();
      }
    );
    tlsSocket.on("error", (e) => console.error("TLS err:", e));
  }
});
