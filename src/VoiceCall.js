import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "c783feed58e1454dae7129b8e46a70a6";
const CHANNEL = "speakmate-room";

let client;

export async function startVoiceCall(setIsPartnerConnected) {
  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  console.log("Joining...");

  await client.join(
    APP_ID,
    CHANNEL,
    null,
    Math.floor(Math.random() * 100000)
  );

  console.log("Joined successfully");

  const micTrack = await AgoraRTC.createMicrophoneAudioTrack();

  await client.publish([micTrack]);

  console.log("Publishing audio");

  client.on("user-published", async (user, mediaType) => {
    console.log("User joined:", user.uid);

    setIsPartnerConnected(true);

    await client.subscribe(user, mediaType);

    if (mediaType === "audio") {
      setTimeout(() => {
        user.audioTrack.play();
      }, 100);
    }
  });

  // 👇 ADD THIS ALSO (important)
  client.on("user-left", () => {
    setIsPartnerConnected(false);
  });
}