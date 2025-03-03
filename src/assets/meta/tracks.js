import * as mm from "music-metadata";
import images from "../img";
import audio from "../audio";

async function generateTracks() {
  const tracks = [];

  for (const [key, src] of Object.entries(audio)) {
    try {
      const metadata = await mm.parseBlob(
        await fetch(src).then((res) => res.blob()),
      );

      const track = {
        title: metadata.common.title || "Unknown Title",
        artist: metadata.common.artist || "Unknown Artist",
        bitrate: Math.round(metadata.format.bitrate / 1000) || 0,
        length: Math.round(metadata.format.duration) || 0,
        audioSrc: src,
        image: images[key.toLowerCase()] || "",
        color: getRandomColor(),
      };

      tracks.push(track);
    } catch (error) {
      console.error(`Error parsing metadata for ${key}:`, error.message);
    }
  }

  return tracks;
}

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

const staticTracks = [
  {
    title: "Sunset (Y.Nakamura Remaster 2019)",
    artist: "Blu-Swing",
    audioSrc: audio.BluSwingSunset,
    image: images.blu_swing,
    color: "#00aeb0",
  },
  {
    title: "BAN",
    artist: "Sakurazaka46",
    audioSrc: audio.Ban,
    image: images.ban,
    color: "#ffb77a",
  },
  {
    title: "PLACEBO",
    artist: "Yonezu Kenshi",
    audioSrc: audio.PLACEBO,
    image: images.stray_sheep,
    color: "#00aeb0",
  },
  {
    title: "Blue Moon Kiss",
    artist: "Sakurazaka46",
    audioSrc: audio.BlueMoonKiss,
    image: images.nobodys_fault,
    color: "#ffb77a",
  },
  {
    title: "なぜ　恋をして来なかったんだろう？",
    artist: "Sakurazaka46",
    audioSrc: audio.Nazekoiwoshitekonakattandarou,
    image: images.nobodys_fault,
    color: "#ffb77a",
  },
  {
    title: "COSMOS",
    artist: "ウォルピスカーター",
    audioSrc: audio.COSMOS,
    image: images.wolpis2,
    color: "#00aeb0",
  },
  {
    title: "Yasashii Hito",
    artist: "Yonezu Kenshi",
    audioSrc: audio.YasashiiHito,
    image: images.stray_sheep,
    color: "#00aeb0",
  },
  {
    title: "Peter Pan",
    artist: "Yuuri",
    audioSrc: audio.PeterPan,
    image: images.peter_pan,
    color: "#5f9fff",
  },
  {
    title: "Shinigami",
    artist: "Yonezu Kenshi",
    audioSrc: audio.Shinigami,
    image: images.pale_blue,
    color: "#ffb77a",
  },
];

export default staticTracks;
// export default generateTracks();
