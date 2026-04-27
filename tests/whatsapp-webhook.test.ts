import { describe, expect, it } from "@jest/globals";
import { extractMessageText, extractSenderContext } from "@/pages/api/whatsapp-webhook";

describe("WhatsApp webhook group parsing", () => {
  it("separates group chat target from the real member sender", () => {
    const payload = {
      sender: "120363400000000000@g.us",
      member: {
        jid: "60123456789@c.us",
        name: "Ali Test",
      },
      data: {
        body: "#status",
        from: "120363400000000000@g.us",
      },
    };

    const senderContext = extractSenderContext(payload);
    const messageText = extractMessageText(payload);

    expect(senderContext.replyTarget).toBe("120363400000000000@g.us");
    expect(senderContext.memberSender).toBe("60123456789@c.us");
    expect(senderContext.groupId).toBe("120363400000000000@g.us");
    expect(messageText).toBe("#status");
  });

  it("falls back to direct sender when the payload is not from a group", () => {
    const payload = {
      sender: "60111222333",
      data: {
        body: "#joinblok",
        from: "60111222333",
      },
    };

    const senderContext = extractSenderContext(payload);
    const messageText = extractMessageText(payload);

    expect(senderContext.replyTarget).toBe("60111222333");
    expect(senderContext.memberSender).toBe("60111222333");
    expect(senderContext.groupId).toBeNull();
    expect(messageText).toBe("#joinblok");
  });
});